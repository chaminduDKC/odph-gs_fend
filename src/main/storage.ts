import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'
import { app, shell } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

export async function savePdfAndOpen(fileName: string, buffer: ArrayBuffer, subFolder:string) {
  try {
    const downloadsDir = app.getPath('documents')
    const targetDir = path.join(downloadsDir, 'my-garage', subFolder)

    await fs.mkdir(targetDir, { recursive: true })

    const filePath = path.join(targetDir, fileName)
    await fs.writeFile(filePath, Buffer.from(buffer))

    const openError = await shell.openPath(filePath)
    if (openError) {
      return { success: false, error: openError }
    }

    return { success: true, data: { filePath } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save paysheet' }
  }
}

interface StoreSchema {
  authToken: string | null
}

const store = new Store<StoreSchema>({
  defaults: {
    authToken: null
  }
})

export function registerStorageHandlers() {
  ipcMain.handle('auth:store-token', async (_, token: string) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(token)
        store.set('authToken', encrypted.toString('base64'))
      } else {
        console.warn('safeStorage encryption not available. Storing plain token.')
        store.set('authToken', token)
      }
    } catch (err) {
      console.error('Error storing token:', err)
      throw err
    }
  })

  ipcMain.handle('auth:get-token', async () => {
    try {
      const token = store.get('authToken')
      if (!token) return null

      if (safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(token, 'base64')
        return safeStorage.decryptString(buffer)
      } else {
        return token
      }
    } catch (err) {
      console.error('Error retrieving token:', err)
      return null
    }
  })

  ipcMain.handle('auth:clear-token', async () => {
    store.delete('authToken')
  })
}
