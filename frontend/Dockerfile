# Development Dockerfile with hot reload
FROM node:20-alpine
# Set working directory
WORKDIR /app
# Install dependencies for better Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci
# Copy source code
COPY . .
# Frontend Environment Variables
# ENV VITE_API_BASE_URL=http://10.10.80.37:3000/api
# ENV VITE_DATA_ENRICHMENT_SERVICE_URL=http://10.10.80.37:3000/api
# ENV VITE_APP_NAME="Tazama Connection Studio"
# ENV VITE_APP_VERSION=0.0.1
# Expose the development server port
EXPOSE 5173
# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]