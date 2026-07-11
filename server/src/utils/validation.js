const { z } = require("zod");

/**
 * Registration validation schema
 * Enforces strong passwords: >8 chars, letters, numbers, special characters
 */
const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required")
    .max(255, "Email must not exceed 255 characters"),
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
      "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)"
    ),
});

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .min(1, "Email is required"),
  password: z
    .string()
    .min(1, "Password is required"),
});

/**
 * Refresh token validation schema
 */
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * User update validation schema (for admin)
 */
const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .optional(),
  role: z.enum(["User", "Admin"]).optional(),
  active: z.boolean().optional(),
});

/**
 * Pagination query validation schema
 */
const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1, "Page must be at least 1")),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1, "Limit must be at least 1").max(100, "Limit must not exceed 100")),
});

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req[source]);
      req[source] = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }
      next(error);
    }
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateUserSchema,
  paginationSchema,
  validate,
};