FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy app source
COPY . .

# Expose app port (default used by code)
EXPOSE 5000

# Production start
CMD ["npm", "start"]

