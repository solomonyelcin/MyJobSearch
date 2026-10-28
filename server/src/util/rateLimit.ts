const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Returns true if the caller still has budget in the current window.
 * Used to protect the (paid) AI endpoints on a public deployment.
 */
export function takeToken(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

export function aiBudgetPerHour(): number {
  const n = parseInt(process.env.AI_REQUESTS_PER_HOUR || '40', 10)
  return Number.isFinite(n) && n > 0 ? n : 40
}
