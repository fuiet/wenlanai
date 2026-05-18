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

// 导出查询函数
export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
// 返回 any 类型以避免 TypeScript 错误
export async function query(text: string, params?: any[]): Promise<any> {
  const [rows] = await pool.execute(text, params);
  return { rows: Array.isArray(rows) ? rows : [] };
}

export async function getClient() {
  return pool.getConnection();
}

export async function getCurrentUserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => {
      const [key, ...val] = c.split('=');
      return [key, val.join('=')];
    })
  );
  
  const token = cookies['session_token'];
  if (!token) return null;
  
  try {
    const result: any = await query(
      'SELECT user_id FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows && result.rows.length > 0) {
      return String(result.rows[0].user_id);
    }
  } catch (e) {
    console.error('getCurrentUserId error:', e);
  }
  
  return null;
}

export default pool;
