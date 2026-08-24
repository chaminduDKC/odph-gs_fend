// src/preload/index.ts
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

const api = {
  pdf: {
    savePdfAndOpen: (fileName: string, buffer: ArrayBuffer, subFolder:string) =>
      ipcRenderer.invoke('pdf:save-pdf-and-open', { fileName, buffer, subFolder }) as Promise<{
        success: boolean
        data?: { filePath: string }
        error?: string
      }>,
  },
 
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)

// One single declare global for BOTH bridges
declare global {
  interface Window {
    electronAPI: ElectronAPI
    api: Api
  }
}