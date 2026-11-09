import { z } from "zod";

// Provisional shapes: planning/plans/phase-4.md holds the final API spec.

export const SourceSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().min(1),
});
export type Source = z.infer<typeof SourceSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(500),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(6),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(SourceSchema),
  isFallback: z.boolean(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
