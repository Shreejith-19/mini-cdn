FROM node:20-alpine

WORKDIR /app

# Install curl and wget for health checks
RUN apk add --no-cache curl wget

# Install backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

EXPOSE 9000

ENV ROUTER_PORT=9000
ENV ORIGIN_URL=http://origin:8000
ENV EDGE_MUMBAI_URL=http://edge-mumbai:8001
ENV EDGE_SINGAPORE_URL=http://edge-singapore:8002
ENV EDGE_FRANKFURT_URL=http://edge-frankfurt:8003
ENV EDGE_NEWYORK_URL=http://edge-newyork:8004
ENV NODE_ENV=production

CMD ["node", "router/routerServer.js"]
