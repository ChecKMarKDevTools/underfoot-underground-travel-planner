FROM node:24-alpine@sha256:6a91b1a45e8c05f63b111e4de3f1c07df17d9b7d3e4a24f2bf1e77ba98a1b98a AS deps
WORKDIR /app
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
COPY package.json package-lock.json ./
COPY backend/package.json backend/
# Install ONLY backend deps (no dev deps from root)
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

FROM node:24-alpine@sha256:6a91b1a45e8c05f63b111e4de3f1c07df17d9b7d3e4a24f2bf1e77ba98a1b98a AS build
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend
# If using TypeScript, compile here; otherwise skip
# RUN npx tsc -w backend (adjust to your tsconfig layout)

FROM node:24-alpine@sha256:6a91b1a45e8c05f63b111e4de3f1c07df17d9b7d3e4a24f2bf1e77ba98a1b98a
WORKDIR /app
# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
ENV NODE_ENV=production
COPY --from=build /app/backend /app/backend
COPY --from=deps /app/node_modules /app/node_modules
# Change ownership to non-root user
RUN chown -R nodeuser:nodejs /app
USER nodeuser
EXPOSE 3000
CMD ["node","backend/src/index.js"]
