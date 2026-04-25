import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).trim(),
  email: z.string().email({ message: "Enter a valid email." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Be at least 8 characters." })
    .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
    .regex(/[0-9]/, { message: "Contain at least one number." }),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: "Enter a valid email." }).trim().toLowerCase(),
  password: z.string().min(1, { message: "Password is required." }),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export type AuthFormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        form?: string[];
      };
    }
  | undefined;
