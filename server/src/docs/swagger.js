const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "MERN Stack Authentication API",
    version: "1.0.0",
    description: `
## Overview
Production-ready Authentication & Authorization API with RBAC support.

## Features
- User Registration with strong password validation
- JWT-based Authentication (Access & Refresh tokens)
- Role-Based Access Control (RBAC)
- Token Rotation & Refresh
- Secure HTTP-only Cookies
- Rate Limiting
- Admin User Management

## Security
- Passwords hashed with bcrypt (12 salt rounds)
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- XSS & NoSQL injection protection
- Secure CORS configuration
    `,
    contact: {
      name: "API Support",
      email: "support@example.com",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:5000/api/v1",
      description: "Development server",
    },
    {
      url: "{serverUrl}/api/v1",
      description: "Production server",
      variables: {
        serverUrl: {
          default: "https://api.example.com",
        },
      },
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your access token (expires in 15 minutes)",
      },
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
        description: "HTTP-only refresh token cookie (7 days)",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "507f1f77bcf86cd799439011" },
          name: { type: "string", example: "John Doe" },
          email: { type: "string", format: "email", example: "john@example.com" },
          role: { type: "string", enum: ["User", "Admin"], example: "User" },
          active: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful" },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              accessToken: { type: "string", example: "eyJhbGciOiJIUzI1..." },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message" },
          code: { type: "string", example: "ERROR_CODE" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          currentPage: { type: "integer", example: 1 },
          totalPages: { type: "integer", example: 10 },
          totalUsers: { type: "integer", example: 100 },
          limit: { type: "integer", example: 10 },
          hasNextPage: { type: "boolean", example: true },
          hasPrevPage: { type: "boolean", example: false },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Unauthorized - Invalid or missing authentication",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Access token is required",
              code: "NO_TOKEN",
            },
          },
        },
      },
      Forbidden: {
        description: "Forbidden - Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Insufficient permissions to access this resource",
              code: "FORBIDDEN",
            },
          },
        },
      },
      BadRequest: {
        description: "Bad Request - Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Validation failed",
              errors: [
                { field: "email", message: "Invalid email address" },
                { field: "password", message: "Password must be at least 8 characters" },
              ],
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "User authentication and session management",
    },
    {
      name: "Admin",
      description: "Administrative user management (Admin only)",
    },
    {
      name: "Health",
      description: "Server health check endpoints",
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user account",
        description: "Create a new user with email and strong password",
        operationId: "register",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 2,
                    maxLength: 50,
                    example: "John Doe",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "john@example.com",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    minLength: 8,
                    description: "Must contain: letter, number, special character",
                    example: "SecureP@ss123",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          409: {
            description: "User already exists",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "User with this email already exists",
                  code: "USER_EXISTS",
                },
              },
            },
          },
          429: {
            description: "Too many requests",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate user and get tokens",
        description: "Login with email and password to receive access and refresh tokens",
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "john@example.com",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "SecureP@ss123",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            headers: {
              "Set-Cookie": {
                schema: {
                  type: "string",
                  example: "refreshToken=eyJhbGci...; HttpOnly; Secure; SameSite=Strict; Path=/",
                },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Invalid email or password",
                  code: "AUTH_FAILED",
                },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout user and invalidate session",
        description: "Clear refresh token and revoke current session",
        operationId: "logout",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Logout successful",
            headers: {
              "Set-Cookie": {
                schema: {
                  type: "string",
                  example: "refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
                },
              },
            },
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
                example: {
                  success: true,
                  message: "Logout successful",
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description: "Use refresh token to get a new access token (token rotation)",
        operationId: "refreshToken",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  refreshToken: {
                    type: "string",
                    description: "Refresh token (from cookie or body)",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Token refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Invalid or expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Session expired. Please login again.",
                  code: "SESSION_EXPIRED",
                },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user profile",
        description: "Retrieve authenticated user's profile information",
        operationId: "getMe",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "User profile retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Get all users (Admin only)",
        description: "Fetch paginated list of all users - strictly for Admin role",
        operationId: "getUsers",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
            description: "Items per page (max 100)",
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search by name or email",
          },
          {
            name: "role",
            in: "query",
            schema: { type: "string", enum: ["User", "Admin"] },
            description: "Filter by role",
          },
          {
            name: "active",
            in: "query",
            schema: { type: "boolean" },
            description: "Filter by active status",
          },
        ],
        responses: {
          200: {
            description: "Users list retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        users: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" },
                        },
                        pagination: { $ref: "#/components/schemas/Pagination" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            $ref: "#/components/responses/Unauthorized",
          },
          403: {
            $ref: "#/components/responses/Forbidden",
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check endpoint",
        description: "Server health and connectivity status",
        operationId: "healthCheck",
        responses: {
          200: {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    timestamp: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = swaggerDocument;