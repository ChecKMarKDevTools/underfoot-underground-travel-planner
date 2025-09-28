# 1) Build stage (needs dev deps)
FROM node:24-alpine@sha256:6a91b1a45e8c05f63b111e4de3f1c07df17d9b7d3e4a24f2bf1e77ba98a1b98a AS builder
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci
COPY frontend ./frontend
RUN npm run -w frontend build

# 2) Runtime stage (tiny, static files only)
FROM nginx:alpine@sha256:a45ee5d7a3aa4d21d4c69ba79b5b14dcd0b5c9e49c6f0bc6f9e34c2f39a2f3f9
# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx && adduser -S nginxuser -u 1001 -G nginx
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
# Change ownership to non-root user
RUN chown -R nginxuser:nginx /usr/share/nginx/html && \
    chown -R nginxuser:nginx /var/cache/nginx && \
    chown -R nginxuser:nginx /var/log/nginx && \
    chown -R nginxuser:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && \
    chown -R nginxuser:nginx /var/run/nginx.pid
USER nginxuser
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
