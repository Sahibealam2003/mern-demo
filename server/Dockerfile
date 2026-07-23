# ─── Backend: Express API ──────────────────────────────────────────────────────
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Runtime environment
ENV NODE_ENV=production
EXPOSE 5000

# Run as the non-root user that comes with the node image
USER node

CMD ["node", "index.js"]
