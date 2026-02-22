FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --production

COPY server/dist/ ./dist/

EXPOSE 3002

CMD ["node", "dist/index.js"]
