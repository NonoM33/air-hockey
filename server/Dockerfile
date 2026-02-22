FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for build
RUN npm install typescript @types/node @types/express @types/cors

# Build
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3002

# Set environment
ENV NODE_ENV=production
ENV PORT=3002

# Start server
CMD ["node", "dist/index.js"]
