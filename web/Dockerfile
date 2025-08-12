# Web Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY web/package*.json ./web/

# Install dependencies
RUN npm ci

# Copy web source
COPY web/ ./web/

# Build Next.js
RUN npm run --workspace web build

# Expose port
EXPOSE 3001

# Start web
CMD ["npm", "run", "--workspace", "web", "start"]
