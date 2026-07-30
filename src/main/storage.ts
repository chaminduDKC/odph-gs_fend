import { ipcMain, safeStorage } from 'electron'
import Store from 'electron-store'

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
