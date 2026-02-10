FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl3 openssl3-dev

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client openssl3 openssl3-dev

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
