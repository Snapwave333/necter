/// <reference types="vite/client" />

// Extend Window in renderer process with electronAPI (declared in preload)
interface ElectronAPI {
  send: (event: unknown) => void;
  on: (callback: (event: unknown) => void) => () => void;
  invoke: <T>(event: unknown) => Promise<T>;
  platform: string;
  getSystemTheme: () => Promise<{ shouldUseDarkColors: boolean }>;
  getVersion: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  showItemInFolder: (filePath: string, cwd?: string) => Promise<boolean>;
  selectFiles: () => Promise<string[]>;
  config: unknown;
  window: unknown;
  mcp: unknown;
  skills: unknown;
  plugins: unknown;
  sandbox: unknown;
  logs: unknown;
  remote: unknown;
  schedule: unknown;
  memory: unknown;
  artifacts: unknown;
  voice: {
    transcribe: (audioBuffer: ArrayBuffer, mimeType: string) => Promise<string>;
    speak: (text: string, voice?: string) => Promise<ArrayBuffer>;
  };
}

interface Window {
  electronAPI: ElectronAPI;
}
