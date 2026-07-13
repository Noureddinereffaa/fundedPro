// In-memory token blacklist with expiry-aware lookups and memory-leak protection.
// Tokens are stored as: token → expiry timestamp (ms).
// If Redis is added in the future, replace this module with a Redis-backed one.

const MAX_SIZE = 10_000 // hard cap to prevent memory exhaustion
const blacklist = new Map<string, number>()

let cleanupTimer: ReturnType<typeof setInterval> | null = null

/** Remove all expired entries. Called periodically and defensively on add. */
function purgeExpired(): void {
  const now = Date.now()
  for (const [token, exp] of blacklist) {
    if (exp <= now) blacklist.delete(token)
  }
}

/** Start the periodic cleanup interval (idempotent). */
function startCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setInterval(purgeExpired, 60_000).unref?.() as ReturnType<typeof setInterval>
}

/**
 * Add a token to the blacklist until its expiry time.
 * @param token  Raw JWT string
 * @param exp    Expiry as Unix timestamp in **milliseconds**
 */
export function addToBlacklist(token: string, exp: number): void {
  // Purge expired tokens first to keep size in check
  if (blacklist.size >= MAX_SIZE) purgeExpired()
  // If still at max after purge (very many active tokens), evict the oldest
  if (blacklist.size >= MAX_SIZE) {
    const firstKey = blacklist.keys().next().value
    if (firstKey) blacklist.delete(firstKey)
  }
  blacklist.set(token, exp)
  startCleanup()
}

/**
 * Returns true only if the token is present **and** has not yet expired.
 * Expired entries are cleaned lazily here to avoid stale positives.
 */
export function isBlacklisted(token: string): boolean {
  const exp = blacklist.get(token)
  if (exp === undefined) return false
  if (exp <= Date.now()) {
    blacklist.delete(token) // lazy eviction
    return false
  }
  return true
}

/** Expose current blacklist size (useful for /health or metrics). */
export function getBlacklistSize(): number {
  return blacklist.size
}

