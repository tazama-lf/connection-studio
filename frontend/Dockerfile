# Development Dockerfile with hot reload
FROM node:20-alpine
# Set working directory
WORKDIR /app
# Install dependencies for better Docker layer caching
COPY package.json package-lock.json* ./
# npm/cli#4828: package-lock.json resolved on a non-Alpine host omits the
# musl-native optional deps (rollup, lightningcss, esbuild, ...), which
# makes Vite crash at startup. Drop the lock so npm re-resolves optionals
# against the actual runtime platform.
RUN rm -f package-lock.json \
 && npm i --legacy-peer-deps
# Copy source code
COPY . .
# Expose the development server port
EXPOSE 5173
# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]