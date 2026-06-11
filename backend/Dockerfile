FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY entrypoint.sh ./

RUN npm install && \
    chmod +x entrypoint.sh && \
    mkdir -p /app/data

COPY src ./src

RUN npm run build

EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
