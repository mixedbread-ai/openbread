import { CheckIcon, CopyIcon, SparklesIcon, UserIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  useContext,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { Message as MessageType } from "../lib/types";
import { Markdown } from "./markdown";
import { TextShimmer } from "./text-shimmer";

interface MessageContextProps {
  message: MessageType;
  isLast: boolean;
}

export const MessageContext = createContext<MessageContextProps | null>(null);

type AssistantMessageProps = ComponentProps<"div">;

export function AssistantMessage({
  className,
  ...props
}: AssistantMessageProps) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
        )}
      >
        <SparklesIcon className="size-4" />
      </div>
      <div className="flex grow flex-col">
        <div className="self-start rounded-md bg-muted px-3 py-2">
          <MessageContent />
        </div>
        <MessageFooter>
          <MessageCopy />
        </MessageFooter>
      </div>
    </div>
  );
}

type UserMessageProps = ComponentProps<"div">;

export function UserMessage({ className, ...props }: UserMessageProps) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
        )}
      >
        <UserIcon className="size-4" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="rounded-md bg-foreground px-3 py-2 text-background">
          <MessageContent />
        </div>
      </div>
    </div>
  );
}

export type PendingMessageProps = ComponentProps<"div">;

export function PendingMessage({ className, ...props }: PendingMessageProps) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
        )}
      >
        <SparklesIcon className="size-4" />
      </div>
      <div className="pt-0.5 pb-10">
        <TextShimmer className="text-sm">Thinking...</TextShimmer>
      </div>
    </div>
  );
}

export type WelcomeMessageProps = ComponentProps<"div">;

export function WelcomeMessage({ className, ...props }: WelcomeMessageProps) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
        )}
      >
        <SparklesIcon className="size-4" />
      </div>
      <div className="flex grow flex-col">
        <div className="self-start rounded-md bg-muted px-3 py-2">
          <Markdown>
            Hi! I&apos;m an AI assistant trained to answer questions about the
            documentation. How can I help you today?
          </Markdown>
        </div>
      </div>
    </div>
  );
}

export type MessageProps = MessageType & {
  UserMessage: typeof UserMessage;
  AssistantMessage: typeof AssistantMessage;
  PendingMessage: typeof PendingMessage;
};

export function Message({
  role,
  status,
  UserMessage,
  AssistantMessage,
  PendingMessage,
}: MessageProps) {
  const isUser = role === "user";

  if (status === "pending") {
    return <PendingMessage />;
  }

  if (isUser) {
    return <UserMessage />;
  }

  return <AssistantMessage />;
}

export type MessageContentProps = ComponentProps<"div">;

export function MessageContent(props: MessageContentProps) {
  const { message } = useMessage();

  return (
    <div {...props}>
      <Markdown>{message.content}</Markdown>
    </div>
  );
}

export type MessageFooterProps = ComponentProps<"div">;

export function MessageFooter({
  className,
  children,
  ...props
}: MessageFooterProps) {
  return (
    <div className={cn("mt-1 flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
}

export type MessageCopyProps = ComponentProps<"button">;

export function MessageCopy({ className, ...props }: MessageCopyProps) {
  const [copied, setCopied] = useState(false);
  const { message } = useMessage();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex size-5 items-center justify-center rounded",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        "transition-all focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
      <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function useMessage() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessage must be used within a Message");
  return ctx;
}
