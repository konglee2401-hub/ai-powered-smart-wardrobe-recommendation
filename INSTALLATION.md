# 📦 Installation Guide

Complete installation instructions for Smart Fashion Prompt Builder

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Local Installation](#local-installation)
3. [Docker Installation](#docker-installation)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

- **OS:** Windows 10+, macOS 10.14+, Ubuntu 18.04+
- **RAM:** 4GB
- **Storage:** 2GB free space
- **CPU:** Dual-core processor

### Recommended Requirements

- **OS:** Windows 11, macOS 12+, Ubuntu 20.04+
- **RAM:** 8GB+
- **Storage:** 5GB free space
- **CPU:** Quad-core processor

### Software Requirements

#### For Local Development

- **Node.js:** v14.0.0 or higher
- **npm:** v6.0.0 or higher
- **Git:** v2.25.0 or higher

#### For Docker Deployment

- **Docker:** v20.10.0 or higher
- **Docker Compose:** v1.29.0 or higher

---

## Local Installation

### Step 1: Install Node.js

#### Windows

1. Visit https://nodejs.org/
2. Download LTS version
3. Run installer
4. Follow installation wizard
5. Verify installation:

```bash
node --version
npm --version
```

#### macOS

```bash
# Using Homebrew
brew install node

# Or download from https://nodejs.org/
```

#### Linux (Ubuntu/Debian)

```bash
# Using apt
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/yourusername/smart-fashion-prompt-builder.git

# Navigate to project
cd smart-fashion-prompt-builder

# Verify structure
ls -la
```

### Step 3: Install Dependencies

```bash
# Install all dependencies
npm run install-all

# Or manually
npm install
cd client && npm install && cd ..
```

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
# or
code .env
```

### Step 5: Start Application

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client

# Application will open at http://localhost:3000
```

---

## Docker Installation

### Step 1: Install Docker

#### Windows

1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run installer
3. Follow installation wizard
4. Restart computer
5. Verify installation:

```bash
docker --version
docker-compose --version
```

#### macOS

```bash
# Using Homebrew
brew install docker docker-compose

# Or download Docker Desktop from https://www.docker.com/products/docker-desktop
```

#### Linux (Ubuntu/Debian)

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Clone Repository

```bash
git clone https://github.com/yourusername/smart-fashion-prompt-builder.git
cd smart-fashion-prompt-builder
```

### Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### Step 4: Build and Start Containers

```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# Verify containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 5: Access Application

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API: http://localhost:5000/api

---

## Verification

### Check Backend

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
# {
#   "success": true,
#   "message": "Server is running",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "environment": "development"
# }
```

### Check Frontend

```bash
# Open browser
http://localhost:3000

# Should see the Fashion Prompt Builder interface
```

### Check API

```bash
# Get use cases
curl http://localhost:5000/api/use-cases

# Expected response:
# {
#   "success": true,
#   "useCases": ["casualBeach", "formalBusiness", ...],
#   "count": 10,
#   "message": "Use cases retrieved successfully"
# }
```

### Run Tests

```bash
# Backend tests
npm test

# Frontend tests
cd client && npm test && cd ..

# All tests
npm run build
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### Node Modules Issues

```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules
rm -rf client/node_modules

# Reinstall
npm run install-all
```

### Docker Issues

```bash
# Check Docker status
docker ps

# Restart Docker
sudo systemctl restart docker

# Remove containers and volumes
docker-compose down -v

# Rebuild
docker-compose up -d --build
```

### Permission Issues

```bash
# Linux - Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# macOS - Check Docker Desktop settings
# Windows - Run as Administrator
```

### Memory Issues

```bash
# Check available memory
free -h

# Increase Docker memory limit
# Edit docker-compose.yml or Docker Desktop settings
```

### Network Issues

```bash
# Check network connectivity
ping google.com

# Check DNS
nslookup google.com

# Check Docker network
docker network ls
docker network inspect fashion-network
```

---

## Next Steps

1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
2. Read [README.md](./README.md) for usage instructions
3. Check [API Documentation](./API.md) for API endpoints
4. Review [Contributing Guide](./CONTRIBUTING.md) for development

---

## Support

For issues and questions:

- GitHub Issues: https://github.com/yourusername/smart-fashion-prompt-builder/issues
- Email: support@fashionpromptbuilder.com
- Discord: [Join Server](https://discord.gg/your-invite)

---

**Version:** 1.0.0
**Last Updated:** 2024
