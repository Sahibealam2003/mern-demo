---
name: website-development
description: Production-ready website development skill for building, maintaining, debugging, and deploying modern web applications using industry best practices.
---

# Website Development

## Purpose

This Skill enables Blackbox AI to build complete production-ready web applications using modern development practices.

Use this Skill whenever the user requests:

- Landing pages
- Company websites
- Portfolio websites
- Dashboards
- Admin Panels
- SaaS Applications
- E-commerce websites
- Blog platforms
- CMS
- Full Stack applications
- Authentication systems
- REST APIs
- Frontend components
- Backend services
- Bug fixing
- Refactoring
- Performance optimization
- Deployment
- CI/CD integration

---

# Primary Goal

Always generate production-ready code.

Never generate demo code unless explicitly requested.

Prefer maintainability over cleverness.

Follow clean architecture.

Write readable and scalable code.

---

# Development Workflow

Always follow this workflow.

## 1. Understand Requirements

Identify

- project type
- frontend
- backend
- database
- authentication
- deployment
- hosting
- third-party services

If requirements are missing, infer sensible defaults.

---

## 2. Plan Architecture

Before writing code explain:

- folder structure
- components
- services
- routes
- API design
- database models
- data flow

---

## 3. Build Features

Implement one feature completely.

Each feature must include

- UI
- validation
- API
- database
- error handling
- loading state
- success state
- testing consideration

---

## 4. Verify

Before finishing ensure

- no lint errors
- no TypeScript errors
- no build errors
- no security issues
- no unused code
- no console logs
- no dead code

---

# Preferred Tech Stack

## Frontend

- HTML5
- CSS3
- JavaScript (ES2023+)
- React
- Next.js
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router
- Axios

---

## Backend

- Node.js
- Express.js

---

## Database

- MongoDB
- Mongoose

---

## Authentication

- JWT
- Refresh Tokens
- Cookies
- RBAC

---

## Realtime

- Socket.io
- Server Sent Events

---

## Cache

- Redis

---

## Queue

- BullMQ

---

## File Storage

- Cloudinary
- AWS S3
- Cloudflare R2

---

## Deployment

- Docker
- Docker Compose
- GitHub Actions
- Nginx
- PM2
- VPS
- AWS
- Azure
- DigitalOcean
- Render
- Vercel

---

# Project Structure

Prefer

```
project/

    frontend/

    backend/

    docker/

    docs/

    .github/

    docker-compose.yml

    README.md
```

---

# Coding Standards

Always

- Use ES Modules
- Use async/await
- Use descriptive variable names
- Use reusable functions
- Keep functions small
- Avoid duplicate logic
- Follow SOLID principles where appropriate
- Prefer composition over inheritance
- Keep files modular

Never

- hardcode secrets
- use magic numbers
- leave TODOs
- leave commented code
- ignore errors

---

# UI Standards

Always create

- responsive layout
- accessible UI
- semantic HTML
- keyboard support
- loading skeletons
- empty states
- error states
- dark mode compatibility when appropriate

---

# Backend Standards

Always include

- validation
- middleware
- centralized error handling
- logging
- pagination
- filtering
- sorting
- rate limiting
- security headers

---

# API Standards

REST naming

Good

GET

```
/api/products
```

POST

```
/api/products
```

GET

```
/api/products/:id
```

PATCH

```
/api/products/:id
```

DELETE

```
/api/products/:id
```

Return

```
success

message

data

errors
```

---

# Database Standards

Always

- normalize schema
- create indexes
- use timestamps
- validate fields
- avoid duplicate data

---

# Authentication Rules

Support

- Register
- Login
- Logout
- Refresh Token
- Forgot Password
- Reset Password
- Email Verification
- Role Based Access

---

# Security

Always include

- Helmet
- CORS
- Rate Limiting
- Input Validation
- Password Hashing
- JWT Verification
- CSRF protection when applicable
- XSS protection
- Secure Cookies
- Environment Variables

Never expose

- API Keys
- Secrets
- Tokens

---

# Performance

Prefer

- lazy loading
- code splitting
- memoization
- pagination
- image optimization
- caching
- database indexing

---

# Docker

Prefer Docker Compose.

Create

- frontend service
- backend service
- mongodb service
- redis service

Include

- health checks
- volumes
- networks
- environment variables

---

# CI/CD

Support

- GitHub Actions

Typical pipeline

Install

↓

Lint

↓

Test

↓

Build

↓

Docker Build

↓

Push Images

↓

Deploy

---

# Testing

Generate tests when requested.

Prefer

- Jest
- React Testing Library
- Supertest

Test

- APIs
- Components
- Authentication
- Validation

---

# Documentation

Always generate

README including

- Installation
- Environment Variables
- Scripts
- Docker Commands
- API Overview
- Deployment Steps

---

# Debugging

When fixing bugs

Always

1. Explain issue
2. Explain root cause
3. Explain affected files
4. Explain fix
5. Generate final code
6. Verify no breaking changes

---

# Refactoring

When refactoring

- preserve behavior
- improve readability
- reduce duplication
- improve maintainability
- avoid unnecessary abstraction

---

# Code Generation Rules

Always generate

- complete files
- production-ready code
- reusable components
- proper imports
- proper exports
- validation
- comments only when useful

Never generate placeholders like

```js
// TODO
```

or

```js
...
```

---

# Examples

## Example 1

User:

```
Build a MERN authentication system.
```

Expected behavior

- Backend APIs
- JWT
- Refresh Token
- MongoDB Models
- React Pages
- Validation
- Protected Routes
- Docker Compose
- README

---

## Example 2

User

```
Create an e-commerce dashboard.
```

Expected behavior

Generate

- Dashboard Layout
- Sidebar
- Charts
- Products
- Orders
- Users
- Authentication
- Responsive UI
- API Integration

---

## Example 3

User

```
Fix authentication bug.
```

Expected behavior

- Analyze root cause
- Explain issue
- Update affected files
- Generate complete code
- Verify build passes

---

# Response Guidelines

Always:

1. Analyze requirements first.
2. Explain architecture before coding.
3. List affected files.
4. Generate complete production-ready code.
5. Mention required packages.
6. Mention environment variables.
7. Verify there are no compile, lint, runtime, TypeScript, security, or breaking-change issues.

Never:

- Generate partial implementations.
- Leave unfinished code.
- Assume hidden dependencies.
- Skip validation or error handling.
- Use deprecated APIs unless explicitly required.