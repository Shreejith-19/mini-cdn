FROM node:20-alpine

WORKDIR /app

# Install curl and wget for health checks
RUN apk add --no-cache curl wget

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

EXPOSE 8001 8002 8003 8004

ENV PORT=8001
ENV EDGE_ID=mumbai
ENV ORIGIN_URL=http://origin:8000
ENV NODE_ENV=production

CMD ["node", "edge/edgeServer.js"]
