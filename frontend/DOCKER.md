# Docker Setup for Tazama Connection Studio Frontend

This directory contains Docker configuration for running the React + Vite frontend application.

## Files Created

- `Dockerfile` - Multi-stage production build with nginx
- `Dockerfile.dev` - Development container with hot reload
- `.dockerignore` - Excludes unnecessary files from Docker context
- `docker-compose.yml` - Orchestration for both dev and prod environments

## Quick Start

### Production Build
```bash
# Build and run production container
docker-compose --profile prod up --build

# Or build manually
docker build -t tazama-frontend .
docker run -p 80:80 tazama-frontend
```

### Development with Hot Reload
```bash
# Run development container with hot reload
docker-compose --profile dev up --build

# Or build manually
docker build -f Dockerfile.dev -t tazama-frontend-dev .
docker run -p 5173:5173 -v ${PWD}:/app -v /app/node_modules tazama-frontend-dev
```

## Docker Commands

### Build Commands
```bash
# Production build
docker build -t tazama-frontend .

# Development build  
docker build -f Dockerfile.dev -t tazama-frontend-dev .
```

### Run Commands
```bash
# Production (serves on port 80)
docker run -p 80:80 tazama-frontend

# Development (serves on port 5173)
docker run -p 5173:5173 -v ${PWD}:/app -v /app/node_modules tazama-frontend-dev
```

### Docker Compose Commands
```bash
# Start production environment
docker-compose --profile prod up -d

# Start development environment
docker-compose --profile dev up -d

# Stop and remove containers
docker-compose down

# Rebuild containers
docker-compose up --build
```

## Features

### Production Image
- Multi-stage build for minimal image size (~20MB)
- Nginx server for optimal static file serving
- React Router support (SPA routing)
- Security headers configured
- Static asset caching
- Health check endpoint

### Development Image
- Hot reload support
- Volume mounting for live code changes
- Development server on port 5173
- Full development environment

## Environment Variables

You can customize the build with environment variables:

```bash
# Custom port for development
docker run -p 3000:5173 -e PORT=3000 tazama-frontend-dev

# Production environment
docker run -p 80:80 -e NODE_ENV=production tazama-frontend
```

## Nginx Configuration

The production Dockerfile includes an optimized nginx configuration that:
- Handles React Router (SPA) routing
- Caches static assets for 1 year
- Includes security headers
- Serves files efficiently

You can customize the nginx configuration by creating an `nginx.conf` file and uncommenting the line in the Dockerfile.

## Troubleshooting

### Port Already in Use
If port 80 or 5173 is already in use, change the port mapping:
```bash
docker run -p 8080:80 tazama-frontend          # Production on port 8080
docker run -p 3000:5173 tazama-frontend-dev    # Development on port 3000
```

### Permission Issues
If you encounter permission issues with volume mounting on Linux/Mac:
```bash
docker run --user $(id -u):$(id -g) -v ${PWD}:/app tazama-frontend-dev
```

### Build Fails
If the build fails, ensure you have the latest Docker version and try:
```bash
docker system prune -f  # Clean up Docker cache
docker-compose up --build --force-recreate
```