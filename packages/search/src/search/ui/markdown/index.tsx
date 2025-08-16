import { type ComponentProps, memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeBlock } from "./code-block";
import { Table, Td, THead, Th, Tr } from "./table";

type MarkdownProps = ComponentProps<typeof ReactMarkdown>;

function MarkdownComponent({ children, ...props }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 text-sm leading-relaxed last:mb-0">{children}</p>
        ),
        h1: ({ children }) => (
          <h1 className="mt-4 mb-2 font-bold text-2xl first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-3 mb-2 font-bold text-xl first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-3 mb-2 font-bold text-lg first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-3 mb-2 font-semibold text-base first:mt-0">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="mt-3 mb-2 font-semibold text-sm first:mt-0">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="mt-3 mb-2 font-semibold text-xs first:mt-0">
            {children}
          </h6>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm leading-relaxed">{children}</li>
        ),
        code: ({ children }) => {
          return (
            <code className="relative rounded-md border border-border bg-accent px-1.5 py-0.5 font-medium font-mono text-foreground text-sm">
              {children}
            </code>
          );
        },
        pre: ({ children, ...props }) => {
          return <CodeBlock {...props}>{children}</CodeBlock>;
        },
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-muted-foreground border-l-2 pl-4 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline decoration-1 decoration-primary underline-offset-4 hover:decoration-2"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-4 border-muted" />,
        table: Table,
        thead: THead,
        tr: Tr,
        th: Th,
        td: Td,
      }}
      {...props}
    >
      {children}
    </ReactMarkdown>
  );
}

export const Markdown = memo(MarkdownComponent);
