const DB_NAME = 'terra-report-editor'
const STORE_NAME = 'draft-files'
const DOCUMENT_KEY = 'new-report-document'

type StoredDraftDocument = {
  blob: Blob
  name: string
  type: string
  lastModified: number
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open draft storage.'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDraftDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = fn(store)
        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => reject(request.error ?? new Error('Draft file storage failed.'))
        tx.oncomplete = () => db.close()
        tx.onerror = () => reject(tx.error ?? new Error('Draft file transaction failed.'))
      }),
  )
}

export async function saveDraftDocument(file: File): Promise<void> {
  const record: StoredDraftDocument = {
    blob: file,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
  }
  await runTransaction('readwrite', (store) => store.put(record, DOCUMENT_KEY))
}

export async function loadDraftDocument(): Promise<File | null> {
  const record = await runTransaction<StoredDraftDocument | undefined>('readonly', (store) =>
    store.get(DOCUMENT_KEY),
  )
  if (!record?.blob) return null
  return new File([record.blob], record.name, {
    type: record.type || record.blob.type,
    lastModified: record.lastModified,
  })
}

export async function clearDraftDocument(): Promise<void> {
  try {
    await runTransaction('readwrite', (store) => store.delete(DOCUMENT_KEY))
  } catch {
    // Ignore cleanup failures.
  }
}
