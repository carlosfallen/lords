FROM oven/bun:1

WORKDIR /app

# Install dependencies (ignoring scripts)
COPY package.json bun.lock ./
COPY packages /app/packages

RUN bun install

# Copy application code
COPY apps/api /app/apps/api

WORKDIR /app/apps/api

EXPOSE 4000

# Start API Server
CMD ["bun", "run", "src/index.ts"]
