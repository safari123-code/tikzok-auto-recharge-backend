import pg from "pg";

export async function tryConnectDb({ env, log }) {
  if (!env.DATABASE_URL) return null;

  const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

  try {
    await pool.query("SELECT 1");
    log.info("db_connected");
    return pool;
  } catch (e) {
    log.error({ e }, "db_connection_failed");
    try { await pool.end(); } catch {}
    return null;
  }
}
