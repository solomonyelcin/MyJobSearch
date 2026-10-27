# Build stage for client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client .
RUN npm run build

# Build stage for server
FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --legacy-peer-deps
COPY server .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps --only=production

# Copy built client
COPY --from=client-builder /app/client/dist ./public

# Copy built server
COPY --from=server-builder /app/server/dist ./server

# Copy server package.json for runtime
COPY server/package*.json ./server/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/index.js"]
