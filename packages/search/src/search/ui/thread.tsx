"use client";

import { ChevronDownIcon } from "lucide-react";
import { motion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Thread as ThreadType } from "../lib/types";
import { getThreadScrollArea } from "../lib/utils";
import {
  AssistantMessage,
  Message,
  MessageContext,
  PendingMessage,
  UserMessage,
  WelcomeMessage,
} from "./message";

interface ThreadContextProps {
  thread: ThreadType;
  isLoading: boolean;
  error?: Error;
  sendMessage: (message: string) => Promise<void>;
}

const ThreadContext = createContext<ThreadContextProps | null>(null);

export type ThreadProps = PropsWithChildren<ThreadContextProps>;

export function Thread({
  thread,
  isLoading = false,
  sendMessage,
  error,
  children,
}: ThreadProps) {
  const memoizedValue = useMemo(
    () => ({ thread, isLoading, error, sendMessage }),
    [thread, isLoading, error, sendMessage]
  );

  return (
    <ThreadContext.Provider value={memoizedValue}>
      {children}
    </ThreadContext.Provider>
  );
}

export interface ThreadViewportProps extends ComponentProps<typeof ScrollArea> {
  autoScroll?: boolean;
}

export function ThreadViewport({
  autoScroll = true,
  className,
  children,
  ...props
}: ThreadViewportProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { thread } = useThread();

  // biome-ignore lint/correctness/useExhaustiveDependencies: -
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = getThreadScrollArea();
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [thread.messages, autoScroll]);

  return (
    <ScrollArea
      data-thread-viewport
      ref={scrollAreaRef}
      className={cn("overflow-hidden", className)}
      {...props}
    >
      {children}
    </ScrollArea>
  );
}

export interface ThreadMessagesProps extends ComponentProps<"div"> {
  components?: {
    Message?: typeof Message;
    AssistantMessage?: typeof AssistantMessage;
    UserMessage?: typeof UserMessage;
    PendingMessage?: typeof PendingMessage;
    WelcomeMessage?: typeof WelcomeMessage;
  };
}

export function ThreadMessages({
  components: {
    Message: MessageComponent = Message,
    AssistantMessage: AssistantMessageComponent = AssistantMessage,
    UserMessage: UserMessageComponent = UserMessage,
    PendingMessage: PendingMessageComponent = PendingMessage,
    WelcomeMessage: WelcomeMessageComponent = WelcomeMessage,
  } = {},
  className,
  ...props
}: ThreadMessagesProps) {
  const { thread } = useThread();

  return (
    <div className={cn("flex flex-col gap-7 px-4 py-6", className)} {...props}>
      <WelcomeMessageComponent />
      {thread.messages.map((message, index) => (
        <MessageContext.Provider
          key={message.id}
          value={{ message, isLast: index === thread.messages.length - 1 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <MessageComponent
              {...message}
              UserMessage={UserMessageComponent}
              AssistantMessage={AssistantMessageComponent}
              PendingMessage={PendingMessageComponent}
            />
          </motion.div>
        </MessageContext.Provider>
      ))}
    </div>
  );
}

export interface ThreadScrollToBottomProps extends ComponentProps<"button"> {
  offset?: number;
}

export function ThreadScrollToBottom({
  offset = 100,
  className,
  ...props
}: ThreadScrollToBottomProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const isBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < offset;
      setIsAtBottom(isBottom);
    };

    const scrollViewport = getThreadScrollArea();
    if (scrollViewport) {
      scrollViewport.addEventListener("scroll", handleScroll);
      return () => scrollViewport.removeEventListener("scroll", handleScroll);
    }
  }, [offset]);

  const scrollToBottom = useCallback(() => {
    const scrollViewport = getThreadScrollArea();
    if (scrollViewport) {
      scrollViewport.scrollTo({
        top: scrollViewport.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <button
      onClick={scrollToBottom}
      data-is-at-bottom={isAtBottom}
      className={cn(
        "-translate-x-1/2 data-[is-at-bottom=true]:-translate-y-2 absolute bottom-4 left-1/2 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-accent data-[is-at-bottom=true]:opacity-0",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
      <span className="sr-only">Scroll to bottom</span>
    </button>
  );
}

type ThreadIfFilters = {
  empty?: boolean;
  loading?: boolean;
  error?: boolean;
};

type UseThreadIfProps = ThreadIfFilters;

const useThreadIf = (props: UseThreadIfProps) => {
  const { thread, isLoading, error } = useThread();

  if (props.empty === true && thread.messages.length > 0) return false;
  if (props.empty === false && thread.messages.length === 0) return false;

  if (props.loading !== undefined && props.loading !== isLoading) return false;

  if (props.error === true && !error) return false;
  if (props.error === false && error) return false;

  return true;
};

export type ThreadIfProps = PropsWithChildren<UseThreadIfProps>;

export function ThreadIf({ children, ...query }: ThreadIfProps) {
  const result = useThreadIf(query);
  return result ? children : null;
}

export function useThread() {
  const ctx = useContext(ThreadContext);
  if (!ctx) throw new Error("useThread must be used within a Thread");
  return ctx;
}
