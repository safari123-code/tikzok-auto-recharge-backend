/**
 * Stub Redis cache (interface stable).
 * Tu pourras brancher ioredis/redis plus tard.
 */
export function buildRedisCache({ env, log }) {
  async function get() { return null; }
  async function set() {}
  async function del() {}
  return { get, set, del };
}
