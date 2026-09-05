import { z } from "zod";

export const submitSchema = z.object({
  token: z.string(),
  nonce: z.string(),
  user_id: z.string(),
  guild_id: z.string(),
});

export type SubmitInput = z.infer<typeof submitSchema>;