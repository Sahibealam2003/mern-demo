import { z } from "zod";

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

/**
 * Registration form validation schema
 * Enforces: >8 chars, letters, numbers, special characters
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (password) => /[a-zA-Z]/.test(password),
      "Password must contain at least one letter"
    )
    .refine(
      (password) => /[0-9]/.test(password),
      "Password must contain at least one number"
    )
    .refine(
      (password) => /[!@#$%^&*(),.?\":{}|<>]/.test(password),
      "Password must contain at least one special character"
    ),
  confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Extract Zod validation errors for form display
 */
export const getFieldErrors = (error) => {
  if (!error) return {};
  
  const errors = {};
  if (error.errors) {
    error.errors.forEach((err) => {
      const field = err.path.join(".");
      errors[field] = err.message;
    });
  }
  return errors;
};