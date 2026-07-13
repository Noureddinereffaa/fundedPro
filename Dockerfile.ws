FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
COPY shared/ /shared/

EXPOSE 3002

CMD ["node", "index.js"]
