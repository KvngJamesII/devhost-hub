import { useState, useEffect, useRef } from 'react';
import { vmApi, FileEntry } from '@/lib/vmApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Folder,
  File,
  Upload,
  MoreVertical,
  Trash2,
  Edit,
  FileCode,
  Loader2,
  FolderPlus,
  FilePlus,
  Save,
  RefreshCw,
  Download,
  Archive,
  CheckSquare,
} from 'lucide-react';

interface PanelFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number | null;
  content?: string;
}

interface FileManagerProps {
  panelId: string;
}

export function FileManager({ panelId }: FileManagerProps) {
  const [files, setFiles] = useState<PanelFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [newName, setNewName] = useState('');
  const [renamingFile, setRenamingFile] = useState<PanelFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingFile, setEditingFile] = useState<PanelFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Draft storage key generator
  const getDraftKey = (filePath: string) => `draft_${panelId}_${filePath}`;

  // Auto-save draft to localStorage
  useEffect(() => {
    if (editingFile && editContent) {
      const draftKey = getDraftKey(editingFile.path);
      const timeoutId = setTimeout(() => {
        localStorage.setItem(draftKey, editContent);
        localStorage.setItem(`${draftKey}_timestamp`, Date.now().toString());
      }, 500); // Debounce 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [editContent, editingFile, panelId]);

  // Clear draft after successful save
  const clearDraft = (filePath: string) => {
    const draftKey = getDraftKey(filePath);
    localStorage.removeItem(draftKey);
    localStorage.removeItem(`${draftKey}_timestamp`);
    setHasDraft(false);
  };

  // Check for existing draft
  const checkForDraft = (filePath: string): string | null => {
    const draftKey = getDraftKey(filePath);
    return localStorage.getItem(draftKey);
  };

  useEffect(() => {
    fetchFiles();
  }, [panelId, currentPath]);

  // Clear selection when changing directory
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [currentPath]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const result = await vmApi.listFiles(panelId, currentPath);
      const mappedFiles: PanelFile[] = result.files.map((f: FileEntry) => ({
        name: f.name,
        path: f.path,
        type: f.type,
        size: f.size,
      }));
      // Sort: directories first, then by name
      mappedFiles.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
      setFiles(mappedFiles);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      setFiles([]);
    }
    setLoading(false);
  };

  const toggleSelect = (path: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    setBulkLoading(true);
    
    try {
      await Promise.all(
        Array.from(selectedFiles).map(path => vmApi.deleteFile(panelId, path))
      );
      toast({
        title: 'Deleted',
        description: `${selectedFiles.size} item(s) deleted`,
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete some files',
        variant: 'destructive',
      });
    }
    setBulkLoading(false);
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return;
    setBulkLoading(true);

    try {
      const filesToDownload = files.filter(f => selectedFiles.has(f.path) && f.type === 'file');
      
      for (const file of filesToDownload) {
        const result = await vmApi.getFileContent(panelId, file.path);
        const blob = new Blob([result.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: 'Downloaded',
        description: `${filesToDownload.length} file(s) downloaded`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download files',
        variant: 'destructive',
      });
    }
    setBulkLoading(false);
  };

  const handleBulkArchive = async () => {
    if (selectedFiles.size === 0) return;
    setBulkLoading(true);

    try {
      const archivePath = currentPath ? `${currentPath}/archive` : 'archive';
      await vmApi.createDirectory(panelId, archivePath);
      
      const filesToArchive = files.filter(f => selectedFiles.has(f.path));
      
      for (const file of filesToArchive) {
        if (file.type === 'file') {
          const result = await vmApi.getFileContent(panelId, file.path);
          await vmApi.syncFiles(panelId, [{ path: `${archivePath}/${file.name}`, content: result.content }]);
          await vmApi.deleteFile(panelId, file.path);
        }
      }
      
      toast({
        title: 'Archived',
        description: `${filesToArchive.length} item(s) moved to archive folder`,
      });
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive files',
        variant: 'destructive',
      });
    }
    setBulkLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);

    try {
      const filePath = currentPath ? `${currentPath}/${newName.trim()}` : newName.trim();
      
      if (createType === 'folder') {
        await vmApi.createDirectory(panelId, filePath);
      } else {
        await vmApi.syncFiles(panelId, [{ path: filePath, content: '' }]);
      }
      
      toast({
        title: 'Created',
        description: `${createType === 'folder' ? 'Folder' : 'File'} created successfully`,
      });
      setNewName('');
      setShowCreateDialog(false);
      fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ' + createType,
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    try {
      const filesToSync = await Promise.all(
        Array.from(uploadedFiles).map(async (file) => {
          const content = await file.text();
          const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
          return { path: filePath, content };
        })
      );

      await vmApi.syncFiles(panelId, filesToSync);

      toast({
        title: 'Uploaded',
        description: `${uploadedFiles.length} file(s) uploaded`,
      });
      fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file: PanelFile) => {
    try {
      await vmApi.deleteFile(panelId, file.path);
      toast({
        title: 'Deleted',
        description: `${file.name} deleted`,
      });
      fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async (file: PanelFile) => {
    setLoadingFileId(file.path);
    setEditingFile(file);
    setEditContent('');
    setHasDraft(false);
    
    try {
      const result = await vmApi.getFileContent(panelId, file.path);
      const savedDraft = checkForDraft(file.path);
      
      if (savedDraft && savedDraft !== result.content) {
        // There's a draft that differs from the server content
        setHasDraft(true);
        setEditContent(savedDraft);
        toast({
          title: 'Draft Restored',
          description: 'Your unsaved changes have been restored from draft',
        });
      } else {
        setEditContent(result.content);
        // Clear draft if it matches server content
        if (savedDraft) clearDraft(file.path);
      }
      setShowEditDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load file content',
        variant: 'destructive',
      });
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleDiscardDraft = async () => {
    if (!editingFile) return;
    clearDraft(editingFile.path);
    
    try {
      const result = await vmApi.getFileContent(panelId, editingFile.path);
      setEditContent(result.content);
      toast({
        title: 'Draft Discarded',
        description: 'Original content restored',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to reload original content',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!editingFile) return;
    setSaving(true);

    try {
      await vmApi.syncFiles(panelId, [{ path: editingFile.path, content: editContent }]);
      clearDraft(editingFile.path);
      toast({
        title: 'Saved',
        description: 'File saved successfully',
      });
      setShowEditDialog(false);
      setEditingFile(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save file',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const handleRename = (file: PanelFile) => {
    setRenamingFile(file);
    setRenameValue(file.name);
    setShowRenameDialog(true);
  };

  const handleRenameSubmit = async () => {
    if (!renamingFile || !renameValue.trim()) return;
    setSaving(true);

    try {
      const oldPath = renamingFile.path;
      const pathParts = oldPath.split('/');
      pathParts.pop();
      const newPath = pathParts.length > 0 
        ? `${pathParts.join('/')}/${renameValue.trim()}`
        : renameValue.trim();

      if (renamingFile.type === 'file') {
        // For files: get content, create new, delete old
        const result = await vmApi.getFileContent(panelId, oldPath);
        await vmApi.syncFiles(panelId, [{ path: newPath, content: result.content }]);
        await vmApi.deleteFile(panelId, oldPath);
      } else {
        // For directories: create new, can't easily move contents via current API
        // Just create new directory (user will need to move files manually)
        await vmApi.createDirectory(panelId, newPath);
        toast({
          title: 'Note',
          description: 'New folder created. Please move files manually and delete old folder.',
        });
      }

      toast({
        title: 'Renamed',
        description: `Renamed to ${renameValue.trim()}`,
      });
      setShowRenameDialog(false);
      setRenamingFile(null);
      fetchFiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to rename',
        variant: 'destructive',
      });
    }
    setSaving(false);
  };

  const navigateToFolder = (folder: PanelFile) => {
    setCurrentPath(folder.path);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const getFileIcon = (file: PanelFile) => {
    if (file.type === 'directory') {
      return <Folder className="w-5 h-5 text-warning" />;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-primary" />;
    }
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const isAllSelected = files.length > 0 && selectedFiles.size === files.length;
  const hasSelection = selectedFiles.size > 0;

  return (
    <div className="h-[calc(100vh-280px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 p-2 sm:p-3 border-b border-border flex items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto min-w-0">
          <Button variant="ghost" size="sm" onClick={navigateUp} disabled={!currentPath} className="px-2">
            ..
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground font-mono truncate max-w-[120px] sm:max-w-none">
            /{currentPath || ''}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setCreateType('folder');
              setShowCreateDialog(true);
            }}
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setCreateType('file');
              setShowCreateDialog(true);
            }}
          >
            <FilePlus className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchFiles} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div className="flex-shrink-0 p-2 border-b border-border bg-muted/50 flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <span className="text-xs sm:text-sm text-muted-foreground ml-2 whitespace-nowrap">
            {selectedFiles.size} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDownload}
            disabled={bulkLoading}
            className="h-8 px-2 sm:px-3"
          >
            <Download className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkArchive}
            disabled={bulkLoading}
            className="h-8 px-2 sm:px-3"
          >
            <Archive className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Archive</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="h-8 px-2 sm:px-3 text-destructive hover:text-destructive"
          >
            {bulkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No files yet</p>
            <p className="text-sm">Create or upload files to get started</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {/* Select All Row */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 border-b border-border/50 mb-2">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <CheckSquare className="w-4 h-4" />
                Select All
              </span>
            </div>
            
            {files.map((file) => (
              <div
                key={file.path}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                  selectedFiles.has(file.path) ? 'bg-muted/30' : ''
                }`}
              >
                <Checkbox
                  checked={selectedFiles.has(file.path)}
                  onCheckedChange={() => toggleSelect(file.path)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-primary flex-shrink-0"
                />
                <button
                  className="flex items-center gap-2 sm:gap-3 flex-1 text-left min-w-0"
                  onClick={() =>
                    file.type === 'directory' ? navigateToFolder(file) : handleEdit(file)
                  }
                  disabled={loadingFileId === file.path}
                >
                  <span className="flex-shrink-0">
                    {loadingFileId === file.path ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      getFileIcon(file)
                    )}
                  </span>
                  <span className="truncate text-sm">{file.name}</span>
                  {file.size !== null && file.type === 'file' && (
                    <span className="text-xs text-muted-foreground ml-auto mr-1 hidden sm:block">
                      {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
                    </span>
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {file.type === 'file' && (
                      <DropdownMenuItem onClick={() => handleEdit(file)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleRename(file)}>
                      <FileCode className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(file)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Create New {createType === 'folder' ? 'Folder' : 'File'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder={createType === 'folder' ? 'folder-name' : 'filename.js'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              {editingFile?.name}
              {hasDraft && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded font-normal">
                  Draft
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {hasDraft && (
                <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
                  Discard Draft
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex-1 min-h-0 h-full font-mono text-sm resize-none bg-muted/50"
            placeholder="File content..."
          />
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename {renamingFile?.type === 'directory' ? 'Folder' : 'File'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="New name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rename'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
