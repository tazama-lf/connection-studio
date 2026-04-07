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
- **Enhanced Validation Logs** with detailed error tracking and expandable error details

## 🆕 Recent Updates

### Validation Logs Enhancement
- **Interactive Error Display**: Click to expand/collapse detailed error information
- **Error Stack Visualization**: Clear hierarchy of validation errors with visual indicators
- **Failed Payload Display**: JSON payload highlighting in dark theme code blocks
- **Advanced Filtering**: Search across endpoints and error messages
- **Time-based Filters**: Filter logs by time periods (24H, 7D, 30D)
- **Export Functionality**: Export validation logs for external analysis

### Folder Structure Modernization
- **Feature-based Architecture**: Migrated to domain-driven folder organization
- **Shared Resources**: Centralized common components and utilities
- **Improved Maintainability**: Clear separation of concerns and consistent structure
- **Enhanced Testing**: Comprehensive Jest test coverage (30/30 tests passing)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd postgres/frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.template .env
# Edit .env file with your configuration

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
├── features/           # Feature-specific modules (domain-driven architecture)
│   ├── auth/          # Authentication management
│   │   ├── contexts/  # Auth context providers
│   │   ├── pages/     # Login and auth pages
│   │   └── services/  # Auth API services
│   ├── cron/          # CRON job scheduling
│   │   ├── components/ # CRON-specific components
│   │   ├── pages/     # CRON module pages
│   │   └── services/  # CRON API services
│   ├── data-enrichment/ # Data transformation workflows
│   │   ├── pages/     # Data enrichment pages
│   │   └── services/  # Enrichment API services
│   ├── dashboard/     # Main dashboard module
│   │   └── pages/     # Dashboard pages
│   ├── dems/          # Dynamic Event Monitoring Service
│   │   ├── pages/     # DEMS module pages
│   │   └── services/  # Endpoint API services
│   └── shared/        # Shared feature utilities
│       └── services/  # Common API services
├── shared/            # Shared application resources
│   ├── components/    # Reusable UI components
│   │   ├── AuthHeader.tsx        # Authentication header
│   │   ├── Button.tsx            # Custom button component
│   │   ├── ValidationLogsTable.tsx # Validation logs display
│   │   ├── EndpointTable.tsx     # Endpoint management table
│   │   ├── PayloadEditor.tsx     # JSON/XML payload editor
│   │   └── ...                   # Other shared components
│   ├── config/        # Application configuration
│   │   ├── api.config.ts         # API endpoints configuration
│   │   ├── app.config.ts         # App-wide settings
│   │   ├── environment.config.ts # Environment variables
│   │   └── routes.config.ts      # Routing configuration
│   ├── constants/     # Application constants
│   ├── providers/     # React context providers
│   ├── services/      # Shared API services
│   └── styles/        # Global styles and themes
├── pages/             # General application pages
│   ├── ErrorBoundaryPage.tsx # Error handling
│   ├── LoadingPage.tsx       # Loading states
│   └── NotFoundPage.tsx      # 404 page
├── router/            # Application routing configuration
├── test/              # Test utilities and setup
│   ├── jest.d.ts      # Jest type definitions
│   ├── jest.setup.ts       # Test environment setup
│   ├── setupTests.ts  # Testing library configuration
│   └── test-utils.tsx # Custom testing utilities
├── App.tsx            # Main application component
├── main.tsx           # Application entry point
└── vite-env.d.ts      # Vite type definitions
```

### Architecture Highlights

- **Feature-Based Organization**: Each feature module is self-contained with its own components, pages, and services
- **Shared Resources**: Common components, configurations, and utilities are centralized in the `shared/` directory
- **Clean Separation**: Clear boundaries between features promote maintainability and scalability
- **Consistent Structure**: Each feature follows the same organizational pattern for predictability

## 🔧 Configuration

### Environment Variables
Copy the `.env.template` file to `.env` and configure your environment:

```bash
# Copy the template
cp .env.template .env
```

The `.env.template` contains:
```env
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Tazama Connection Studio
VITE_APP_VERSION=0.0.1
```

**Environment Variables Explained:**
- `VITE_API_BASE_URL`: Backend API server URL
- `VITE_APP_NAME`: Application display name
- `VITE_APP_VERSION`: Current application version

> **Note**: All environment variables for Vite must be prefixed with `VITE_` to be accessible in the client code.

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

# For support or questions
- Review existing issues, discussions and pull requests
- Start a discussion in the **Discussions** tab or create an issue in the **Issues** tab in this repository
- Join the Tazama Slack workspace and post your question in the **#get-help** channel - :point_right: Join here: https://slack.tazama.org
