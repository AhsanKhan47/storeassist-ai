import { z } from "zod";

// The chat API contract (planning/plans/phase-4.md). POST /api/chat replies with Server-Sent Events:
//   meta -> delta (repeated) -> done      or      error
// Errors found before streaming starts are plain JSON (ErrorResponse) with an HTTP status.

export const MAX_MESSAGE_CHARS = 500;
export const MAX_MESSAGES = 6;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    .max(MAX_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "The last message must come from the user.",
    }),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** One excerpt shown to the model. Citation [n] in the answer always means sources[n - 1]. */
export const SourceSchema = z.object({
  index: z.number().int().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  heading: z.string().nullable(),
  excerpt: z.string().min(1),
  score: z.number(),
});
export type Source = z.infer<typeof SourceSchema>;

export const ProviderNameSchema = z.enum(["groq", "gemini", "cerebras"]);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const MetaEventSchema = z.object({
  sources: z.array(SourceSchema),
  isFallback: z.boolean(),
  cached: z.boolean(),
});
export type MetaEvent = z.infer<typeof MetaEventSchema>;

export const DeltaEventSchema = z.object({ text: z.string() });
export type DeltaEvent = z.infer<typeof DeltaEventSchema>;

export const DoneEventSchema = z.object({ provider: ProviderNameSchema.nullable() });
export type DoneEvent = z.infer<typeof DoneEventSchema>;

export const StreamErrorCodeSchema = z.enum(["busy", "internal"]);
export const StreamErrorEventSchema = z.object({
  code: StreamErrorCodeSchema,
  message: z.string(),
});
export type StreamErrorEvent = z.infer<typeof StreamErrorEventSchema>;

export type ChatStreamEvent =
  | { event: "meta"; data: MetaEvent }
  | { event: "delta"; data: DeltaEvent }
  | { event: "done"; data: DoneEvent }
  | { event: "error"; data: StreamErrorEvent };

export const ErrorCodeSchema = z.enum(["invalid_request", "rate_limited", "busy", "internal"]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ErrorResponseSchema = z.object({
  error: z.object({ code: ErrorCodeSchema, message: z.string() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
