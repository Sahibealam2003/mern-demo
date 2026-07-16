# syntax=docker/dockerfile:1

############################
# Build stage (Vite -> dist)
############################
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
# Use legacy peer deps to avoid install failures due to optional peer deps
RUN npm ci --legacy-peer-deps


# Copy source
COPY . .

# Build the frontend
RUN npm run build

############################
# Production stage (serve static files)
############################
FROM nginx:1.27-alpine AS production

# Remove default nginx site
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback + caching for static assets
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets aggressively
  location ~* \/(?:assets|static)/.*\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
    expires 30d;
    add_header Cache-Control 'public, immutable';
  }
}
EOF


EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

