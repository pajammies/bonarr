# syntax=docker/dockerfile:1

# 1) Deps stage — install workspaces with npm
FROM node:20-alpine AS deps
WORKDIR /app
# Base manifests
COPY package.json package-lock.json ./
# Workspace manifests (so npm ci can cache)
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
# Include shared packages manifests if present
COPY packages ./packages
RUN npm install --workspaces --include-workspace-root

# 2) Build stage — build backend and frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build both workspaces
RUN npm run build -w apps/backend && npm run build -w apps/frontend

# 3) Runtime — slim node image with built backend + static frontend
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy node_modules and built backend
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
# Copy frontend build into /app/public to be served by Fastify static
COPY --from=build /app/apps/frontend/dist ./public

EXPOSE 3005
CMD ["node", "apps/backend/dist/index.js"]