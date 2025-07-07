// src/components/MarkdownViewer.tsx

import React from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import Image from "next/image";

interface Props {
  content: string;
}

export default function MarkdownViewer({ content }: Props) {
  return (
    <div className="prose prose-neutral max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:leading-7 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic prose-img:rounded-lg prose-img:max-w-full">
      <Markdown
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        remarkPlugins={[remarkGfm]}
        components={{
          // 안전한 타입 정의로 hydration 오류 방지
          h1: ({ children, ...props }) => (
            <h1 {...props} className="text-3xl font-bold mt-8 mb-4">
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 {...props} className="text-2xl font-semibold mt-8 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props} className="text-xl font-semibold mt-6 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 {...props} className="text-lg font-semibold mt-4 mb-2">
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p {...props} className="leading-7 my-4">
              {children}
            </p>
          ),
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc list-inside ml-4 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal list-inside ml-4 space-y-1">
              {children}
            </ol>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-gray-300 pl-4 py-2 my-4 italic"
            >
              {children}
            </blockquote>
          ),
          code: ({
            children,
            className,
            ...props
          }: React.ComponentPropsWithoutRef<"code">) => {
            const isInline = !className?.includes("language-");
            if (isInline) {
              return (
                <code
                  {...props}
                  className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono"
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="overflow-x-auto rounded-lg my-4 bg-gray-100 p-4 text-sm">
                <code {...props} className={className}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children, ...props }) => (
            <table {...props} className="w-full border-collapse my-6 text-sm">
              {children}
            </table>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="border-b px-4 py-2 text-left font-semibold"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td {...props} className="border-b px-4 py-2">
              {children}
            </td>
          ),
          img: ({ src, alt, ...props }) => {
            const imageSrc = typeof src === "string" ? src : "";
            return (
              <Image
                {...props}
                src={imageSrc}
                alt={alt ?? ""}
                width={800}
                height={600}
                className="rounded-lg max-w-full my-4"
                style={{ width: "auto", height: "auto" }}
              />
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
