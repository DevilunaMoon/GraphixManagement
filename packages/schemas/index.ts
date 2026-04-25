// Default basic exports for schemas package
import { z } from "zod";

export const UserSchema = z.object({
    id: z.string().cuid(),
    email: z.string().email(),
    name: z.string().optional(),
});
