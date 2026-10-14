# ==========================================
# Stage 1: Build the React + Vite application
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests first for optimal Docker layer caching
COPY package.json package-lock.json ./

# Clean install all dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the production-ready static assets
RUN npm run build

# ==========================================
# Stage 2: Serve application using Nginx
# ==========================================
FROM nginx:alpine AS production

# Copy custom Nginx configuration for SPA routing & caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from build stage to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
