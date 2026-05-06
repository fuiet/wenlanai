'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// 自定义引用块类型
interface QuoteBlockProps {
  children: React.ReactNode;
  type?: 'default' | 'story' | 'question' | 'famous';
  author?: string;
}

// 引用块组件
function QuoteBlock({ children, type = 'default', author }: QuoteBlockProps) {
  const quoteStyles = {
    default: {
      border: 'border-l-4 border-amber-400',
      bg: 'bg-amber-50/50 dark:bg-amber-950/20',
      icon: 'text-amber-500',
    },
    story: {
      border: 'border-l-4 border-rose-400',
      bg: 'bg-rose-50/50 dark:bg-rose-950/20',
      icon: 'text-rose-500',
    },
    question: {
      border: 'border-l-4 border-cyan-400',
      bg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
      icon: 'text-cyan-500',
    },
    famous: {
      border: 'border-l-4 border-indigo-400',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      icon: 'text-indigo-500',
    },
  };

  const style = quoteStyles[type];
  const icons = {
    default: '"',
    story: '📖',
    question: '❓',
    famous: '💡',
  };

  return (
    <blockquote className={cn('my-4 rounded-r-lg p-4 italic', style.border, style.bg)}>
      <div className="mb-2 flex items-center gap-2 text-xl not-italic" style={{ fontFamily: 'serif' }}>
        <span className={style.icon}>{icons[type]}</span>
        {author && <span className="text-sm font-normal not-italic text-gray-500">—— {author}</span>}
      </div>
      <div className="text-gray-700 dark:text-gray-300">{children}</div>
    </blockquote>
  );
}

// 自定义分隔线组件
function CustomHR() {
  return (
    <div className="my-6 flex items-center justify-center gap-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600"></div>
      <span className="text-gray-400">✦</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600"></div>
    </div>
  );
}

// 数字列表项组件
function NumberListItem({ children, num }: { children: React.ReactNode; num: number }) {
  return (
    <div className="mb-3 flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm shadow-sm">
        {num}
      </div>
      <div className="flex-1 pt-1">{children}</div>
    </div>
  );
}

// 核心要点组件
function KeyPoint({ children, emoji = '👉' }: { children: React.ReactNode; emoji?: string }) {
  return (
    <div className="my-3 flex gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
      <span className="text-xl">{emoji}</span>
      <div className="flex-1 text-gray-700 dark:text-gray-300">{children}</div>
    </div>
  );
}

// 增强版文章渲染组件
interface EnhancedArticleProps {
  content: string;
  className?: string;
}

export function EnhancedArticle({ content, className }: EnhancedArticleProps) {
  return (
    <article className={cn('prose prose-lg max-w-none dark:prose-invert', className)}>
      <style jsx global>{`
        /* 标题样式优化 */
        .article-content h1 {
          font-size: 1.75rem;
          font-weight: 800;
          text-align: center;
          margin: 2rem 0 1.5rem;
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .article-content h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 1.75rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #f59e0b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .article-content h2:before {
          content: '📌';
          font-size: 1.2rem;
        }
        .article-content h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem;
          color: #ea580c;
          padding-left: 0.75rem;
          border-left: 3px solid #f59e0b;
        }
        
        /* 段落样式 */
        .article-content p {
          line-height: 1.9;
          margin: 1rem 0;
          text-align: justify;
        }
        
        /* 强调文本 */
        .article-content strong {
          color: #ea580c;
          font-weight: 600;
        }
        .article-content em {
          color: #64748b;
        }
        
        /* 列表样式 */
        .article-content ul {
          margin: 1rem 0;
          padding-left: 0;
          list-style: none;
        }
        .article-content ul li {
          position: relative;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          line-height: 1.8;
        }
        .article-content ul li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #f59e0b;
          font-weight: bold;
          font-size: 1.5rem;
          line-height: 1.5;
        }
        
        .article-content ol {
          margin: 1rem 0;
          padding-left: 0;
          counter-reset: list-counter;
          list-style: none;
        }
        .article-content ol li {
          position: relative;
          padding-left: 2.5rem;
          margin: 0.75rem 0;
          counter-increment: list-counter;
        }
        .article-content ol li::before {
          content: counter(list-counter);
          position: absolute;
          left: 0;
          width: 1.75rem;
          height: 1.75rem;
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.85rem;
        }
        
        /* 引用块样式 */
        .article-content blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.25rem;
          border-radius: 0 8px 8px 0;
          border-left: 4px solid #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          font-style: italic;
          color: #78716c;
        }
        .article-content blockquote strong {
          color: #ea580c;
        }
        
        /* 分隔线样式 */
        .article-content hr {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, transparent, #d4d4d4, transparent);
          margin: 2rem 0;
        }
        
        /* 代码块样式 */
        .article-content code {
          background: #fef3c7;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.9em;
          color: #c2410c;
        }
        .article-content pre {
          background: #1e293b;
          border-radius: 8px;
          padding: 1rem;
          overflow-x: auto;
        }
        .article-content pre code {
          background: transparent;
          color: #e2e8f0;
          padding: 0;
        }
        
        /* 图片样式 */
        .article-content img {
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          margin: 1.5rem auto;
        }
        
        /* 表格样式 */
        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
        }
        .article-content th {
          background: linear-gradient(135deg, #f59e0b, #ea580c);
          color: white;
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
        }
        .article-content td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .article-content tr:hover {
          background: #fffbeb;
        }
      `}</style>
      
      <div className="article-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // 自定义图片组件
            img: ({ src, alt }) => {
              const imageSrc = typeof src === 'string' ? src : '';
              const imageAlt = typeof alt === 'string' ? alt : String(alt || '插图');
              return (
                <div className="my-6 flex flex-col items-center">
                  <div className="relative overflow-hidden rounded-xl shadow-lg">
                    <Image
                      src={imageSrc}
                      alt={imageAlt}
                      width={800}
                      height={450}
                      className="max-h-[450px] w-auto object-cover"
                    />
                  </div>
                  {imageAlt && imageAlt !== '插图' && (
                    <p className="mt-2 text-sm text-gray-500 italic">{imageAlt}</p>
                  )}
                </div>
              );
            },
            
            // 自定义链接
            a: ({ href, children }) => (
              <a 
                href={href} 
                className="text-orange-600 underline decoration-orange-300 hover:decoration-orange-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}

// 纯文本预览组件（更轻量）
export function SimpleArticlePreview({ content, className }: EnhancedArticleProps) {
  return (
    <div className={cn('prose prose-sm max-w-none dark:prose-invert', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { QuoteBlock, CustomHR, NumberListItem, KeyPoint };
