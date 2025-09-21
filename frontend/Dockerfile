# 1) Build stage (needs dev deps)
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm ci
COPY frontend ./frontend
RUN npm run -w frontend build

# 2) Runtime stage (tiny, static files only)
FROM nginx:alpine

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf.template /etc/nginx/nginx.conf

# Change ownership to non-root user and ensure nginx directories are accessible
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    chmod -R 755 /var/cache/nginx && \
    chmod -R 750 /var/log/nginx

# Switch to non-root user
USER appuser
EXPOSE 8080
CMD ["nginx","-g","daemon off;"]
