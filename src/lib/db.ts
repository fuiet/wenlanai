import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 返回统一的 rows 结构，便于 API 路由复用。
export async function query<T extends Record<string, unknown> = Record<string, string>>(
  text: string,
  params?: Parameters<typeof pool.execute>[1]
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[] }> {
  const [rows] = await pool.execute(text, params);
  return { rows: Array.isArray(rows) ? (rows as T[]) : [] };
}

export async function getClient() {
  return pool.getConnection();
}

export async function getCurrentUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieEntries = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const [key, ...value] = cookie.split('=');
      return [key, decodeURIComponent(value.join('='))];
    });
  const parsedCookies = Object.fromEntries(cookieEntries);

  const token = parsedCookies.session_token;
  if (!token) return null;

  try {
    const result = await query<{ user_id: string | number }>(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length > 0) {
      return String(result.rows[0].user_id);
    }
  } catch (error) {
    console.error('getCurrentUserId error:', error);
  }

  return null;
}

export default pool;
