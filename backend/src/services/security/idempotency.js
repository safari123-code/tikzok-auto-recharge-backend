export function buildIdempotency() {
  const locks = new Map(); // key -> expiresAtMs

  function tryLock(key, ttlSec) {
    const now = Date.now();
    const exp = locks.get(key);
    if (exp && exp > now) return false;
    locks.set(key, now + ttlSec * 1000);
    return true;
  }

  return { tryLock };
}
