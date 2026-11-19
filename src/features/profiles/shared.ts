import { z } from "zod";
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Use at least two characters for your name.")
    .max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,40}$/,
      "Use 3–40 lowercase letters, numbers, or underscores for your handle.",
    ),
  bio: z.string().trim().max(500),
  avatarVariant: z.coerce.number().int().min(0).max(23),
});
