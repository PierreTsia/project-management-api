# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (skip husky)
RUN pnpm install --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only (skip husky)
RUN pnpm install --prod --ignore-scripts

# Copy built application and i18n directory from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/i18n ./i18n
COPY --from=builder /app/src/email/templates ./src/email/templates

# Create uploads directory
RUN mkdir -p uploads && chmod 777 uploads

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["pnpm", "start:prod"] 