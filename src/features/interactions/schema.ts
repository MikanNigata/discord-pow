import { z } from "zod";

const optionSchema = z.object({
  name: z.string(),
  value: z.unknown(),
});

export const interactionSchema = z
  .object({
    id: z.string().min(1),
    type: z.number().int(),
    guild_id: z.string().optional(),
    guild: z.object({ id: z.string() }).optional(),
    member: z.object({ user: z.object({ id: z.string() }).optional() }).optional(),
    user: z.object({ id: z.string() }).optional(),
    data: z
      .object({
        name: z.string().optional(),
        custom_id: z.string().optional(),
        options: z.array(optionSchema).optional(),
      })
      .optional(),
  })
  .passthrough();

export type Interaction = z.infer<typeof interactionSchema>;