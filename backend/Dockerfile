FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
# Install ONLY backend deps (no dev deps from root)
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend
# If using TypeScript, compile here; otherwise skip
# RUN npx tsc -w backend (adjust to your tsconfig layout)

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend /app/backend
COPY --from=deps /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["node","backend/dist/index.js"]
