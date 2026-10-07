import { z } from "zod";

export const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters long." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." }),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
