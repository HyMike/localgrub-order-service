FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build


FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]


