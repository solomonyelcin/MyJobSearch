interface Entry {
  expires: number
  value: unknown
}

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()
const MAX_ENTRIES = 300

/** Small in-memory TTL cache with in-flight de-duplication. Keeps us polite to free job APIs. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expires > now) return hit.value as T

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const promise = load()
    .then(value => {
      if (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value
        if (oldest !== undefined) store.delete(oldest)
      }
      store.set(key, { expires: Date.now() + ttlMs, value })
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}
