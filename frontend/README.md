# Tazama Connection Studio (TCS) Frontend

> **Frontend portal and orchestration layer for API publishers**

The Tazama Connection Studio (TCS) is a comprehensive web-based platform designed to streamline the management and orchestration of API endpoints for data processing and enrichment workflows. This frontend portal provides an intuitive interface for API publishers to configure, deploy, and monitor their ingestion endpoints.

## 🎯 Core Features

### API Management
- **Define new ingestion APIs** (including schema, enrichment rules, endpoint paths)
- **Submit configurations** to the Admin Service
- **View deployment status** of ingestion endpoints
- **Real-time monitoring** and health checks

### Data Enrichment
- **Configure data transformation rules** and mapping schemas
- **Define enrichment pipelines** for incoming data streams
- **Template management** for reusable configurations
- **Preview and validate** transformations before deployment

### CRON Job Management
- **Schedule automated tasks** and batch processing jobs
- **Monitor job execution** status and logs
- **Configure recurring workflows** with flexible scheduling
- **Manage job dependencies** and error handling

### Endpoint Management (DEMS)
- **Centralized endpoint configuration** and lifecycle management
- **API versioning** and backward compatibility
- **Security policies** and access control configuration
- **Performance monitoring** and analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd connection-studio/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Type checking
npm run type-check
```

## 🏗️ Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context API
- **Routing**: React Router DOM
- **HTTP Client**: Custom API client with authentication
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + Prettier

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components and layouts
├── features/           # Feature-specific modules
│   ├── auth/          # Authentication management
│   ├── cron/          # CRON job scheduling
│   ├── data-enrichment/ # Data transformation
│   ├── dashboard/     # Main dashboard
│   ├── dems/          # Endpoint management
│   └── shared/        # Shared utilities and services
├── config/            # Configuration files
├── contexts/          # React context providers
├── router/            # Application routing
├── styles/            # Global styles and themes
└── test/              # Test utilities and setup
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Tazama Connection Studio
VITE_NODE_ENV=development
```

### API Configuration
The application communicates with the backend API through a centralized client located in `src/config/api.config.ts`. Modify this file to adjust API endpoints and authentication settings.

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API service and workflow testing
- **E2E Testing**: Critical user journey validation

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=apiClient.test.ts
```

## 🔐 Authentication

The TCS frontend implements secure authentication with:
- **JWT token management** with automatic refresh
- **Role-based access control** (Admin, Editor, Viewer)
- **Secure session handling** with localStorage persistence
- **Automatic logout** on token expiration

## 📱 Responsive Design

The interface is fully responsive and optimized for:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Touch-optimized navigation and forms
- **Mobile**: Essential functionality with streamlined UI

## 🔄 API Integration

### Supported Operations
- **CRUD operations** for all resource types
- **Bulk operations** for batch processing
- **Real-time updates** via polling/webhooks
- **Error handling** with user-friendly messages

### Data Flow
1. **Configuration**: Define API schemas and rules
2. **Validation**: Client-side and server-side validation
3. **Submission**: Secure transmission to Admin Service
4. **Deployment**: Automated endpoint provisioning
5. **Monitoring**: Real-time status and performance tracking

## 🚀 Deployment

### Production Build
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Maintain responsive design principles
- Update documentation for significant changes