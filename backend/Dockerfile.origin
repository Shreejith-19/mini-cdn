FROM node:20-alpine

WORKDIR /app

# Install curl and wget for health checks
RUN apk add --no-cache curl wget

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Ensure storage directory exists
RUN mkdir -p /app/origin/storage

EXPOSE 8000

ENV PORT=8000
ENV NODE_ENV=production

CMD ["node", "server.js"]
