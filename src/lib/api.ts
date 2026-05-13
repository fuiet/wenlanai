/**
 * API 配置工具
 * 统一管理所有 API 请求的基础 URL
 */

// 微信相关 API 基础 URL - 使用宝塔后端域名
export const WECHAT_API_BASE_URL = 'https://wenlanai.top';

// 业务 API 基础 URL - 使用本地 API（dev.coze.site）
// 空字符串表示使用相对路径，由浏览器自动使用当前域名
export const API_BASE_URL = '';

/**
 * 获取微信 API 的完整 URL
 */
export function getWechatApiUrl(path: string): string {
  return `${WECHAT_API_BASE_URL}${path}`;
}

/**
 * 封装的 fetch 函数，用于微信 API
 */
export async function wechatApiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getWechatApiUrl(path);
  return fetch(url, {
    ...options,
    ...(!options.headers && { headers: { 'Content-Type': 'application/json' } }),
  });
}
