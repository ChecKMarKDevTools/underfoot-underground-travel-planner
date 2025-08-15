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
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
