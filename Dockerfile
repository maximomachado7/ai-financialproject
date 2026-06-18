FROM node:20-alpine

WORKDIR /app

COPY server/package.json ./
RUN npm install --production

COPY server/index.js ./
COPY server/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
