FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
# The frontend gets mounted at runtime via docker-compose (./web -> /app/public)
RUN mkdir -p /app/public
EXPOSE 8080
CMD ["node", "src/index.js"]