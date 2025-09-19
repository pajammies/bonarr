FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json tsconfig.json ./
RUN npm ci --ignore-scripts
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# sqlite3 needs native module built; reuse artifacts from build stage by reinstalling with scripts
RUN apk add --no-cache python3 make g++ \
 && npm ci --omit=dev --ignore-scripts=false \
 && apk del python3 make g++
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
