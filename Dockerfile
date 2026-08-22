# Step 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Compile TypeScript to dist
RUN npm run build

# Step 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files from builder stage
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown -R node:node /app

USER node

EXPOSE 5000

# Run with dumb-init
CMD ["dumb-init", "node", "dist/server.js"]
