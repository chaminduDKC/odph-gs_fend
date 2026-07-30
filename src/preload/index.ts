import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  storeToken: (token: string) => ipcRenderer.invoke('auth:store-token', token),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  clearToken: () => ipcRenderer.invoke('auth:clear-token'),
  platform: process.platform,
})

export type ElectronAPI = {
  storeToken: (token: string) => Promise<void>
  getToken: () => Promise<string | null>
  clearToken: () => Promise<void>
  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
