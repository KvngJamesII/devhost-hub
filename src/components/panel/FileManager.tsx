import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
} from 'lucide-react';

interface PanelFile {
  id: string;
  name: string;
  path: string;
  content: string | null;
  is_directory: boolean;
}

interface FileManagerProps {
  panelId: string;
}

export function FileManager({ panelId }: FileManagerProps) {
  const [files, setFiles] = useState<PanelFile[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
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
    const { data, error } = await supabase
      .from('panel_files')
      .select('*')
      .eq('panel_id', panelId)
      .eq('path', currentPath)
      .order('is_directory', { ascending: false })
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load files',
        variant: 'destructive',
      });
    } else {
      setFiles(data as PanelFile[]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const { error } = await supabase.from('panel_files').insert({
      panel_id: panelId,
      name: newName.trim(),
      path: currentPath,
      is_directory: createType === 'folder',
      content: createType === 'file' ? '' : null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create ' + createType,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Created',
        description: `${createType === 'folder' ? 'Folder' : 'File'} created successfully`,
      });
      setNewName('');
      setShowCreateDialog(false);
      fetchFiles();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (const file of Array.from(uploadedFiles)) {
      const content = await file.text();
      await supabase.from('panel_files').insert({
        panel_id: panelId,
        name: file.name,
        path: currentPath,
        is_directory: false,
        content,
      });
    }

    toast({
      title: 'Uploaded',
      description: `${uploadedFiles.length} file(s) uploaded`,
    });
    fetchFiles();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file: PanelFile) => {
    const { error } = await supabase.from('panel_files').delete().eq('id', file.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: `${file.name} deleted`,
      });
      fetchFiles();
    }
  };

  const handleEdit = (file: PanelFile) => {
    setEditingFile(file);
    setEditContent(file.content || '');
    setShowEditDialog(true);
  };

  const handleSave = async () => {
    if (!editingFile) return;
    setSaving(true);

    const { error } = await supabase
      .from('panel_files')
      .update({ content: editContent })
      .eq('id', editingFile.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save file',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'File saved successfully',
      });
      setShowEditDialog(false);
      setEditingFile(null);
      fetchFiles();
    }
    setSaving(false);
  };

  const navigateToFolder = (folder: PanelFile) => {
    setCurrentPath(currentPath + folder.name + '/');
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath('/' + (parts.length > 0 ? parts.join('/') + '/' : ''));
  };

  const getFileIcon = (file: PanelFile) => {
    if (file.is_directory) {
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
          <Button variant="ghost" size="sm" onClick={navigateUp} disabled={currentPath === '/'}>
            ..
          </Button>
          <span className="text-sm text-muted-foreground font-mono truncate">{currentPath}</span>
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
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <button
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() =>
                    file.is_directory ? navigateToFolder(file) : handleEdit(file)
                  }
                >
                  {getFileIcon(file)}
                  <span className="truncate">{file.name}</span>
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
                    {!file.is_directory && (
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
