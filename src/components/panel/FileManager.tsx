import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { vmApi, FileEntry } from '@/lib/vmApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
  Plus,
  Upload,
  MoreVertical,
  Trash2,
  Edit,
  FileCode,
  Loader2,
  FolderPlus,
  FilePlus,
  X,
  Save,
  RefreshCw,
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
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [newName, setNewName] = useState('');
  const [editingFile, setEditingFile] = useState<PanelFile | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [panelId, currentPath]);

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
      // If directory doesn't exist yet, show empty
      setFiles([]);
    }
    setLoading(false);
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
    setEditingFile(file);
    setEditContent('');
    setShowEditDialog(true);
    
    try {
      const result = await vmApi.getFileContent(panelId, file.path);
      setEditContent(result.content);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load file content',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!editingFile) return;
    setSaving(true);

    try {
      await vmApi.syncFiles(panelId, [{ path: editingFile.path, content: editContent }]);
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

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button variant="ghost" size="sm" onClick={navigateUp} disabled={!currentPath}>
            ..
          </Button>
          <span className="text-sm text-muted-foreground font-mono truncate">/{currentPath || ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCreateType('folder');
              setShowCreateDialog(true);
            }}
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCreateType('file');
              setShowCreateDialog(true);
            }}
          >
            <FilePlus className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
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

      {/* File List */}
      <div className="flex-1 overflow-auto p-3">
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
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <button
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() =>
                    file.type === 'directory' ? navigateToFolder(file) : handleEdit(file)
                  }
                >
                  {getFileIcon(file)}
                  <span className="truncate">{file.name}</span>
                  {file.size !== null && file.type === 'file' && (
                    <span className="text-xs text-muted-foreground ml-auto mr-2">
                      {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
                    </span>
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
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
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
          </DialogHeader>
          <Textarea
            className="flex-1 font-mono text-sm resize-none"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="// Your code here..."
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
