# Project Management API

[![codecov](https://codecov.io/gh/PierreTsia/project-management-api/graph/badge.svg?token=jTkd57KjtY)](https://codecov.io/gh/PierreTsia/project-management-api)

A robust REST API for project management, built with NestJS and TypeScript.

## Features

- 🔐 Authentication with JWT and refresh tokens
- 👤 User management with email confirmation
- 🔄 Password reset functionality
- 📧 Email notifications
- 🌐 Internationalization support
- 🧪 Comprehensive test coverage

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- JWT Authentication
- Google Athentication
- Jest for testing
- PNPM for package management
- Docker

## Getting Started

### Prerequisites

- Node.js 20.x
- PNPM 8.x
- PostgreSQL
- Docker and Docker Compose (for Docker setup)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

#### Local Development

```bash
# Start development server
pnpm start:dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Lint code
pnpm lint
```

#### Docker Development

```bash
# Start development environment with Docker
pnpm start:dev:docker
```

This will:
- Build and start all required services (API, PostgreSQL, etc.)
- Set up the development environment automatically
- Watch for changes and rebuild as needed

## API Documentation

API documentation is available at `/api` when running the server.

## Testing

```bash
# Unit tests
pnpm test

# e2e tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
