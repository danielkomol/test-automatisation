export const DB_NAME = import.meta.env.VITE_APP_DB_NAME || 'todo-app-db'
export const DB_VERSION = Number(import.meta.env.VITE_APP_DB_VERSION || 1)

const memoryStore = new Map()

export function resetMemoryStores() {
  memoryStore.clear()
}

function openDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Impossible d\'ouvrir la base de données.'))
  })
}

export async function readStore(storeName) {
  if (!('indexedDB' in window)) {
    return memoryStore.get(storeName) ?? []
  }

  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error(`Lecture impossible dans ${storeName}.`))

    transaction.oncomplete = () => db.close()
  })
}

export async function writeStore(storeName, value) {
  if (!('indexedDB' in window)) {
    const current = memoryStore.get(storeName) ?? []
    const existingIndex = current.findIndex((item) => item.id === value.id)

    if (existingIndex >= 0) {
      current[existingIndex] = value
    } else {
      current.push(value)
    }

    memoryStore.set(storeName, current)
    return value
  }

  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(value)

    request.onsuccess = () => resolve(value)
    request.onerror = () => reject(request.error ?? new Error(`Sauvegarde impossible dans ${storeName}.`))

    transaction.oncomplete = () => db.close()
  })
}

export async function deleteFromStore(storeName, id) {
  if (!('indexedDB' in window)) {
    const current = memoryStore.get(storeName) ?? []
    memoryStore.set(
      storeName,
      current.filter((item) => item.id !== id),
    )
    return true
  }

  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error ?? new Error(`Suppression impossible dans ${storeName}.`))

    transaction.oncomplete = () => db.close()
  })
}
