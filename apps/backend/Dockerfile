FROM node:20-alpine AS base

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/backend/package*.json ./
COPY apps/backend/prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/backend ./

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./
COPY --from=base /app/prisma ./prisma

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
