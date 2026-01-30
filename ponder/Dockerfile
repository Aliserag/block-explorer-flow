FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port (Railway uses dynamic PORT)
EXPOSE 42069

# Start Ponder - uses PORT env var if set, otherwise 42069
CMD ["sh", "-c", "npx ponder start --port ${PORT:-42069}"]
