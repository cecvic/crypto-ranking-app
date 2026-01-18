'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        // Headings
        'prose-headings:font-semibold prose-headings:text-foreground',
        // Paragraphs - reduce default spacing
        '[&>p]:my-2 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
        // Lists
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
        'prose-ul:pl-4 prose-ol:pl-4',
        '[&_ul]:list-disc [&_ol]:list-decimal',
        // Code blocks
        'prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border prose-pre:rounded-lg',
        'prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
        'prose-code:before:content-none prose-code:after:content-none',
        // Blockquotes
        'prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        // Tables
        'prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden',
        'prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-th:border-b prose-th:border-border',
        'prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border',
        'prose-tr:last:border-0',
        // Links
        'prose-a:text-primary prose-a:underline prose-a:underline-offset-2',
        // Strong/em
        'prose-strong:font-semibold prose-strong:text-foreground',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom table wrapper for horizontal scroll on mobile
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 -mx-1 px-1">
              <table className="min-w-full">{children}</table>
            </div>
          ),
          // Ensure code blocks render properly
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom pre for code blocks
          pre: ({ children }) => (
            <pre className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto my-3 text-sm">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
