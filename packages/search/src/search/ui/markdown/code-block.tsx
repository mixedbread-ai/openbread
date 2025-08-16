"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import {
  type ComponentProps,
  isValidElement,
  memo,
  type ReactNode,
  useState,
} from "react";
import { SyntaxHighlighter } from "./syntax-highlighter";

interface CodeBlockProps extends ComponentProps<"pre"> {
  children?: ReactNode;
}

interface ReactElementProps {
  className?: string;
  children?: ReactNode;
}

const getCodeInfo = (
  children: ReactNode
): { language: string; code: string } => {
  if (
    isValidElement(children) &&
    children.props &&
    typeof children.props === "object"
  ) {
    const props = children.props as ReactElementProps;
    const className = props.className;
    const match = className?.match(/language-(\w+)/);
    const language = match ? match[1] : "text";

    // Extract text content recursively
    const extractText = (node: ReactNode): string => {
      if (typeof node === "string") return node;
      if (typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(extractText).join("");
      if (
        isValidElement(node) &&
        node.props &&
        typeof node.props === "object"
      ) {
        const nodeProps = node.props as ReactElementProps;
        if (nodeProps.children) {
          return extractText(nodeProps.children);
        }
      }
      return "";
    };

    const code = extractText(props.children || "").replace(/\n$/, "");
    return { language, code };
  }

  // Fallback: treat the entire children as plain text
  return {
    language: "text",
    code: typeof children === "string" ? children : "",
  };
};

function CodeBlockComponent({ children, className, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const { language, code } = getCodeInfo(children);

  // If no code content, render as regular pre
  if (!code.trim()) {
    return (
      <pre className={className} {...props}>
        {children}
      </pre>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative mb-3">
      <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground backdrop-blur-sm hover:border-border/60 hover:bg-accent/80 hover:text-foreground"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>

      <SyntaxHighlighter language={language} showLanguage={false}>
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
