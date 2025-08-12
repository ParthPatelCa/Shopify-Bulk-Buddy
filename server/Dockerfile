# Server Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/

# Install dependencies
RUN npm ci

# Copy prisma schema and generate client
COPY prisma/ ./prisma/
RUN npm run prisma:generate

# Copy server source
COPY server/ ./server/

# Build TypeScript
RUN npm run --workspace server build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "--workspace", "server", "start"]
