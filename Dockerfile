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

ENV NODE_ENV=production

# Install server production dependencies
COPY server/package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copy built server and client
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
