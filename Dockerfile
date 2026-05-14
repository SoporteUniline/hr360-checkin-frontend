# Etapa 1: build
FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_RUTA_BACKEND
ENV NEXT_PUBLIC_RUTA_BACKEND=$NEXT_PUBLIC_RUTA_BACKEND
ARG NEXT_PUBLIC_RUTA_DOMAIN
ENV NEXT_PUBLIC_RUTA_DOMAIN=$NEXT_PUBLIC_RUTA_DOMAIN
ARG NEXT_PUBLIC_AWS_URL
ENV NEXT_PUBLIC_AWS_URL=$NEXT_PUBLIC_AWS_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: imagen final con standalone output
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
