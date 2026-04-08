# Tazama Connection Studio (TCS)

Tazama Connection Studio (TCS) is a comprehensive design-time configuration management platform that enables financial institutions to create, validate, and deploy transaction monitoring configurations without writing code. TCS serves as the bridge between business requirements and runtime execution by providing a full-stack solution — a visual frontend for schema definition and mapping configuration, combined with a robust backend API for lifecycle management and deployment orchestration.

**What TCS is:**
- A design-time configuration management platform for creating and managing transaction schemas that can be dynamically processed at runtime
- A visual schema and mapping editor with real-time validation for DEMS (Dynamic Event Monitoring Service) configurations
- A data enrichment job orchestration system supporting both PUSH and PULL operations with SFTP integration
- A CRON-based job scheduler for automated data processing and synchronization tasks
- A lifecycle management system with maker-checker-approver-publisher workflow for configuration artifacts
- A multi-tenant platform with role-based access control (Editor, Approver, Exporter, Publisher)
- An audit logging system tracking all configuration changes and workflow transitions

**What TCS is NOT:**
- A runtime transaction processing engine
- A real-time monitoring system
- A data storage or analytics platform

## User Manual and Video Demonstration
- Please refer to the user manual here: https://github.com/tazama-lf/docs/blob/dev/Guides/User%20Manuals%20for%20Downloading/Tazama%20Connection%20Studio.docx
- Please refer to the demonstration video here: https://drive.google.com/file/d/119Jjgf__MCMxg1kbC4mr192zF2KXO6rR/view?usp=sharing
- 
## Architecture

### High-Level Flow

```
Editor (Frontend) → TCS Backend API → Configuration Database → Admin Service → DEMS → Runtime Execution
```

---

## Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 9+
- PostgreSQL 14+
- Redis/Valkey (for caching)
- Keycloak (for authentication)
- Docker & Docker Compose (for containerized setup)

### 1. Clone the Repository

```bash
git clone https://github.com/tazama-lf/connection-studio.git
cd connection-studio
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Copy environment example
cp .env.template .env

# Start development server
npm run dev
# Frontend available at http://localhost:5173
```

### 3. Backend Setup

```bash
cd ../backend
npm install

# Copy environment example
cp .env.example .env

# Configure database and services in .env
# Key variables:
# - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB
# - TAZAMA_AUTH_URL, AUTH_PUBLIC_KEY_PATH
# - SFTP_HOST_CONSUMER, SFTP_HOST_PRODUCER
# - ADMIN_SERVICE_URL

# Start development server
npm run start:dev
# Backend API available at http://localhost:3010
```

### 4. Docker Compose Setup (Full Environment)

```bash
# From root directory, start entire stack
docker-compose -f backend/docker-compose-tcs.yml up -d

# This starts:
# - Backend API (port 3010)
# - PostgreSQL
# - Redis
# - SFTP Server
# - NATS Broker
```

---

## Project Structure

### Root Directory

```
connection-studio/
├── frontend/                         # React 18 frontend application
│   ├── src/
│   │   ├── features/                # Feature modules (domain-driven)
│   │   │   ├── auth/                # Authentication & login
│   │   │   ├── approver/            # Approver workflows
│   │   │   ├── config/              # Configuration management
│   │   │   ├── cron/                # CRON job scheduling
│   │   │   ├── dashboard/           # Main dashboard
│   │   │   ├── data-enrichment/     # Data transformation
│   │   │   ├── data-model/          # Data model extensions
│   │   │   ├── exporter/            # Export workflows
│   │   │   ├── functions/           # Shared functions
│   │   │   └── publisher/           # Publishing workflows
│   │   ├── shared/                  # Shared resources
│   │   │   ├── components/          # Reusable components
│   │   │   ├── config/              # Configuration files
│   │   │   ├── providers/           # Context providers
│   │   │   └── services/            # Shared API services
│   │   ├── pages/                   # General pages
│   │   ├── router/                  # Route configuration
│   │   ├── utils/                   # Utilities
│   │   ├── test/                    # Test setup
│   │   └── main.tsx                 # Entry point
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   └── .env.template
│
├── backend/                          # NestJS backend application
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                # Authentication & authorization
│   │   │   ├── config/              # Configuration CRUD & management
│   │   │   ├── tazama-data-model/   # Dynamic data model operations
│   │   │   ├── job/                 # Background job management
│   │   │   ├── scheduler/           # Task scheduling
│   │   │   ├── sftp/                # File transfer operations
│   │   │   ├── notification/        # Event notifications
│   │   │   ├── audit-log/           # Audit trail tracking
│   │   │   └── simulation/          # Pre-deployment simulation
│   │   ├── common/
│   │   │   ├── decorators/          # Custom decorators
│   │   │   ├── filters/             # Exception filters
│   │   │   ├── guards/              # Authorization guards
│   │   │   ├── interceptors/        # HTTP interceptors
│   │   │   └── pipes/               # Validation pipes
│   │   ├── constants/               # Application constants
│   │   ├── enums/                   # TypeScript enums
│   │   ├── utils/                   # Utility functions
│   │   ├── logger-service/          # Logging service
│   │   ├── app.module.ts            # Root module
│   │   └── main.ts                  # Entry point
│   ├── test/                        # E2E tests
│   ├── Dockerfile
│   ├── docker-compose-tcs.yml
│   ├── docker-compose-infra.yml
│   ├── package.json
│   ├── .env.example
│   ├── jest.config.ts
│   └── tsconfig.json
│
├── README.md                        # This file
└── LICENSE
```

---

## Development Commands

### Frontend Commands (from `frontend/`)

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview prod build locally

# Testing
npm run test             # Run all tests with coverage
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:cron        # CRON module tests only

# Linting & Formatting
npm run lint             # Lint + format check
npm run lint:eslint      # ESLint only
npm run lint:prettier    # Prettier check
npm run fix              # Auto-fix all issues
npm run format           # Format code
```

### Backend Commands (from `backend/`)

```bash
# Development
npm run start            # Start application
npm run start:dev        # Start with watch mode
npm run start:debug      # Start with debugging
npm run start:prod       # Production mode

# Building
npm run build            # Compile TypeScript to JavaScript

# Testing
npm run test             # Run unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:debug       # Debug mode
npm run test:e2e         # End-to-end tests

# Linting & Formatting
npm run lint             # Lint + format check
npm run lint:eslint      # ESLint only
npm run lint:prettier    # Prettier check
npm run fix              # Auto-fix all issues
npm run format           # Format code
```

---

## Testing

### Frontend Testing

- **Unit Tests**: Jest-based component and hook testing
- **Integration Tests**: API service and provider testing
- **Coverage**: Targeted coverage for feature modules
- **Tools**: Jest, React Testing Library, Vitest

```bash
npm run test             # All tests with coverage
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:cron        # CRON module only
```

### Backend Testing

- **Unit Tests**: Jest-based service and controller testing
- **E2E Tests**: Full application endpoint testing
- **Test Database**: Separate test database configuration
- **Tools**: Jest, Supertest

```bash
npm run test             # Unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # End-to-end tests
```

---

## Deployment

### Environment Variables

#### Frontend (`.env`)

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_DATA_ENRICHMENT_SERVICE_URL=http://localhost:3000/api

# Application
VITE_APP_TITLE=Tazama Connection Studio
VITE_APP_ENV=production
```

#### Backend (`.env`)

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YourPassword

# Application
NODE_ENV=production
PORT=3010
SESSION_TIMEOUT_MINUTES=30

# Authentication
TAZAMA_AUTH_URL=https://keycloak-server/v1/auth
AUTH_PUBLIC_KEY_PATH=public-key.pem

# SFTP Configuration
SFTP_HOST_CONSUMER=sftp.server
SFTP_PORT_CONSUMER=22
SFTP_USERNAME_CONSUMER=user
SFTP_PASSWORD_CONSUMER=encrypted_password

# SFTP Producer
SFTP_HOST_PRODUCER=sftp.server
SFTP_PORT_PRODUCER=22
SFTP_USERNAME_PRODUCER=user
SFTP_PASSWORD_PRODUCER=encrypted_password

# Message Broker
SERVER_URL=nats://nats-server:4222
STARTUP_TYPE=nats
PRODUCER_STREAM=config.notification
CONSUMER_STREAM=config.notification

# Admin Service
ADMIN_SERVICE_URL=http://admin-service:3105

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=noreply@tazama.com
SMTP_FROM_NAME=Tazama Connection Studio
```

Please refer to the deployment guide here: https://github.com/tazama-lf/docs/blob/dev/Technical/Deployment-Guides/TCS-Deployment-Guide.md

### Docker Deployment

#### Frontend Only

```bash
cd frontend
docker build -t tcs-frontend:latest .
docker run -p 80:5173 tcs-frontend:latest
```

#### Backend Only

```bash
cd backend
docker build -t tcs-backend:latest .
docker run -p 3010:3010 --env-file .env tcs-backend:latest
```

#### Full Stack with Docker Compose

```bash
# Start all services
cd backend
docker-compose -f docker-compose-tcs.yml up -d

# Or include infrastructure services
docker-compose -f docker-compose-infra.yml -f docker-compose-tcs.yml up -d

# View logs
docker-compose logs -f connection-studio-backend

# Stop services
docker-compose down
```

---
## Security

### Frontend Security

- **JWT Authentication**: Token-based auth with secure localStorage
- **401 Interceptor**: Automatic session management and logout
- **Role-Based Routes**: Route protection based on user roles
- **CSRF Protection**: Built-in CORS and security headers
- **Input Validation**: Yup schema validation on all forms

### Backend Security

- **JWT Validation**: Signature verification using Keycloak public key
- **Role-Based Access Control (RBAC)**: Four roles — `editor`, `approver`, `exporter`, `publisher`
- **Authorization Guards**: NestJS guards for endpoint protection
- **Tenant Isolation**: Complete multi-tenant data separation
- **Input Sanitization**: Class-validator pipes for request validation
- **Audit Logging**: Complete configuration change tracking
- **Encryption**: Database password and sensitive data encryption

---

## Features

### Configuration Management (DEMS)

- **Schema Creation**: Define JSON-based transaction schemas
- **Version Control**: Automatic schema versioning and history
- **Field Mapping**: Support for DIRECT, SPLIT, CONCAT, CONSTANT, FN_CALL mapping types
- **Dynamic Functions**: Built-in functions for data enrichment
- **Validation**: Real-time validation with detailed error messages
- **Lifecycle Management**: Maker → Checker → Publisher workflow

### Data Enrichment

- **Job Creation**: Create and manage enrichment jobs
- **Job Cloning**: Duplicate jobs for rapid configuration
- **Pagination**: Efficient job list browsing
- **History Tracking**: Review enrichment job versions

### CRON Job Management

- **Schedule Definition**: Flexible cron expression support
- **Visual Builder**: Cron expression constructor
- **Job Listing**: Search and filter CRON jobs
- **Execution Monitoring**: Track job status and logs

### Role-Based Workflows

- **Editor**: Create, edit, and submit configurations
- **Approver**: Review and approve/reject submissions with feedback
- **Exporter**: Export approved configurations to external systems
- **Publisher**: Deploy and publish configurations to DEMS

### Data Model Extensions

- **Schema Extensions**: Extend Tazama core collection schemas
- **Destination Mapping**: Map fields to destination objects
- **Hierarchy Navigation**: Interactive tree view for complex structures
- **Field Validation**: Support for multiple data types and nested objects

---

## Technology Stack

### Frontend

- **React 18** — Modern UI framework
- **TypeScript** — Type-safe development
- **Vite** — Fast build tool and dev server
- **Tailwind CSS v4** — Utility-first styling
- **Material UI (MUI) v7** — Component library
- **Ant Design v5** — Additional UI components
- **React Router v7** — Client-side routing
- **React Hook Form + Yup** — Form management and validation
- **Lucide React** — Icon library
- **Jest + React Testing Library** — Testing frameworks

### Backend

- **NestJS 11** — Node.js framework
- **TypeScript** — Type-safe development
- **Prisma** — Database ORM
- **PostgreSQL 14+** — Primary database
- **Redis/Valkey** — Caching and sessions
- **Passport + JWT** — Authentication
- **Swagger/OpenAPI** — API documentation
- **Jest + Supertest** — Testing frameworks
- **Class-Validator** — DTO validation
- **Nodemailer** — Email notifications

### Infrastructure

- **Docker** — Containerization
- **Docker Compose** — Multi-container orchestration
- **PostgreSQL** — Relational database
- **Redis** — In-memory cache
- **NATS** — Message broker
- **Keycloak** — Identity provider
- **SFTP** — File transfer
- **Node.js 20** — Runtime

---

# For support or questions
- Review existing issues, discussions and pull requests
- Start a discussion in the **Discussions** tab or create an issue in the **Issues** tab in this repository
- Join the Tazama Slack workspace and post your question in the **#get-help** channel - :point_right: Join here: https://slack.tazama.org
