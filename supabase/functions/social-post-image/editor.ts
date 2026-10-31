import { z } from "npm:zod@3";

export const EditorImageSchema = z.object({
  mode: z.literal("editor"),
  post_id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(500),
  description: z.string().trim().min(2).max(10000),
  ratio: z.enum(["1:1", "4:5", "9:16"]),
  stream: z.boolean().default(true),
});