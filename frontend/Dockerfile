FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

EXPOSE 5173

ENV VITE_PORT=5173
ENV VITE_ROUTER_URL=http://localhost:9000
ENV VITE_ORIGIN_URL=http://localhost:8000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
