import type { FileSearchResponse } from "@mixedbread/sdk/resources/vector-stores.mjs";
import type { z } from "zod";
import type { SearchQuerySchema } from "./validations";

export interface SearchMetadata {
  title?: string;
  description?: string;
  url?: string;
  tag?: string;
  breadcrumb?: string[];
}

export interface Result {
  id: string;
  url: string;
  title: string;
  tag: string;
  breadcrumb: string[];
  external?: boolean;
}

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export type TransformFunc = (results: FileSearchResponse["data"]) => Result[];

export type Message =
  | {
      status: "completed";
      id: string;
      role: "user" | "assistant" | "system";
      content: string;
      createdAt: Date;
    }
  | {
      status: "pending";
      id: string;
      role: "assistant";
      content: string;
    };

export interface Thread {
  id: string;
  messages: Message[];
  isLoading?: boolean;
  error?: Error;
}

export interface ComposerState {
  value: string;
  isSubmitting: boolean;
}

export type SendMessageFunc = (content: string) => Promise<void>;
