import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.PGDATABASE_URL || process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 增加到30秒
});

// 导出查询函数
export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
}

// 导出获取客户端
export async function getClient() {
  return pool.connect();
}

// 获取当前登录用户的ID（从Cookie中）
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
    const result = await query(
      'SELECT user_id::text FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].user_id;
    }
  } catch (e) {
    console.error('getCurrentUserId error:', e);
  }
  
  return null;
}

export default pool;
