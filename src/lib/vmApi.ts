import { supabase } from "@/integrations/supabase/client";

// Types for VM API responses
export interface AppStatus {
  panelId: string;
  exists: boolean;
  port: number | null;
  status: 'stopped' | 'running' | 'deploying' | 'error';
  pid?: number;
  memory?: number;
  cpu?: number;
  uptime?: number;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number | null;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  cwd?: string;
  code?: number;
}

export interface LogsResult {
  panelId: string;
  logs: {
    out: string;
    err: string;
  };
}

// Generic VM API call
async function vmApiCall<T>(action: string, panelId: string, params: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('vm-proxy', {
    body: { action, panelId, ...params },
  });

  if (error) {
    console.error('VM API error:', error);
    throw new Error(error.message || 'VM API call failed');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

// App management
export const vmApi = {
  // App operations
  getStatus: (panelId: string) => 
    vmApiCall<AppStatus>('app:status', panelId),

  deploy: (panelId: string, language: 'nodejs' | 'python') => 
    vmApiCall<{ success: boolean; port: number; message: string }>('app:deploy', panelId, { language }),

  start: (panelId: string, language: 'nodejs' | 'python', entryPoint?: string) => 
    vmApiCall<{ success: boolean; port: number; message: string }>('app:start', panelId, { language, entryPoint }),

  stop: (panelId: string) => 
    vmApiCall<{ success: boolean; message: string }>('app:stop', panelId),

  restart: (panelId: string) => 
    vmApiCall<{ success: boolean; port: number; message: string }>('app:restart', panelId),

  delete: (panelId: string) => 
    vmApiCall<{ success: boolean; message: string }>('app:delete', panelId),

  // File operations
  listFiles: (panelId: string, dir: string = '') => 
    vmApiCall<{ files: FileEntry[] }>('files:list', panelId, { dir }),

  getFileContent: (panelId: string, path: string) => 
    vmApiCall<{ path: string; content: string }>('files:content', panelId, { path }),

  syncFiles: (panelId: string, files: Array<{ path: string; content: string }>) => 
    vmApiCall<{ success: boolean; synced: number }>('files:sync', panelId, { files }),

  deleteFile: (panelId: string, path: string) => 
    vmApiCall<{ success: boolean; deleted: string }>('files:delete', panelId, { path }),

  createDirectory: (panelId: string, path: string) => 
    vmApiCall<{ success: boolean; created: string }>('files:mkdir', panelId, { path }),

  // Terminal operations
  exec: (panelId: string, command: string) => 
    vmApiCall<ExecResult>('terminal:exec', panelId, { command }),

  // Log operations
  getLogs: (panelId: string, lines: number = 100) => 
    vmApiCall<LogsResult>('logs:get', panelId, { lines }),

  clearLogs: (panelId: string) => 
    vmApiCall<{ success: boolean; message: string }>('logs:clear', panelId),
};

export default vmApi;
