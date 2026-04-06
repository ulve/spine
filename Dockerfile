# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-slim AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build:backend

# Stage 3: Final Production Image
FROM node:20-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update -y && \
    apt-get install -y openssl graphicsmagick ghostscript libvips-dev && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

# Copy built backend
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/prisma ./prisma

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Generate Prisma Client (needed even in production)
RUN npx prisma generate

# Create directories for data and books
RUN mkdir -p /app/data/covers /app/books

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
