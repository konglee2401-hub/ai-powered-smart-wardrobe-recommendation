# 🚀 Deployment Guide

Smart Fashion Prompt Builder - Complete Deployment Instructions

## Table of Contents

1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/smart-fashion-prompt-builder.git
cd smart-fashion-prompt-builder

# Install dependencies
npm run install-all

# Create environment file
cp .env.example .env

# Start development servers
npm run server  # Terminal 1
npm run client  # Terminal 2

# Open browser
http://localhost:3000
```

### Development Commands

```bash
# Backend
npm run dev              # Start with nodemon
npm test                 # Run tests
npm run lint             # Lint code
npm run lint:fix         # Fix linting issues

# Frontend
cd client
npm start                # Start development server
npm test                 # Run tests
npm run build            # Build for production
```

---

## Docker Deployment

### Prerequisites

- Docker >= 20.10
- Docker Compose >= 1.29

### Quick Start

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild containers
docker-compose up -d --build
```

### Docker Commands

```bash
# Build specific service
docker-compose build backend
docker-compose build frontend

# Start specific service
docker-compose up -d backend

# Execute command in container
docker-compose exec backend npm test

# View container logs
docker-compose logs backend -f

# Remove all containers and volumes
docker-compose down -v

# Prune unused Docker resources
docker system prune -a
```

### Docker Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect <volume-name>

# Remove volume
docker volume rm <volume-name>
```

---

## Production Deployment

### AWS EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Update system
sudo yum update -y
sudo yum install -y docker git

# Start Docker
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

#### 2. Clone and Deploy

```bash
# Clone repository
git clone https://github.com/yourusername/smart-fashion-prompt-builder.git
cd smart-fashion-prompt-builder

# Create environment file
cp .env.example .env
# Edit .env with production values

# Start with Docker Compose
docker-compose -f docker-compose.yml up -d
```

#### 3. Configure Domain

```bash
# Update Route 53 DNS records to point to EC2 instance
# Or use Elastic IP for static IP address
```

### Heroku Deployment

#### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

#### 2. Deploy Backend

```bash
# Create Heroku app
heroku create fashion-prompt-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://your-frontend.com

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### 3. Deploy Frontend

```bash
# Create Heroku app
heroku create fashion-prompt-web

# Set environment variables
heroku config:set REACT_APP_API_URL=https://fashion-prompt-api.herokuapp.com/api

# Deploy
git push heroku main
```

### DigitalOcean Deployment

#### 1. Create Droplet

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y
apt install -y docker.io docker-compose git

# Start Docker
systemctl start docker
usermod -aG docker $USER
```

#### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/smart-fashion-prompt-builder.git
cd smart-fashion-prompt-builder

# Create environment file
cp .env.example .env

# Start with Docker Compose
docker-compose up -d
```

#### 3. Configure Firewall

```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## Environment Configuration

### Production Environment Variables

```bash
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database (if needed)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=fashion_prompt_builder
DB_USER=postgres
DB_PASSWORD=your_secure_password

# API
API_TIMEOUT=30000
MAX_REQUEST_SIZE=10mb

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/app/server.log

# CORS
CORS_ORIGIN=https://your-domain.com

# Session
SESSION_SECRET=your_very_secure_random_key_here
SESSION_TIMEOUT=3600000

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem

# Third-party APIs
OPENAI_API_KEY=your_openai_key_here
```

### Secrets Management

```bash
# Using AWS Secrets Manager
aws secretsmanager create-secret \
  --name fashion-prompt-builder/prod \
  --secret-string file://secrets.json

# Using HashiCorp Vault
vault kv put secret/fashion-prompt-builder/prod @secrets.json

# Using GitHub Secrets (for CI/CD)
# Add secrets in GitHub repository settings
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check backend health
curl http://localhost:5000/health

# Check frontend
curl http://localhost:3000

# Docker health
docker-compose ps
```

### Logging

```bash
# View backend logs
docker-compose logs backend -f

# View frontend logs
docker-compose logs frontend -f

# View nginx logs
docker-compose logs nginx -f

# Export logs
docker-compose logs backend > backend.log
```

### Performance Monitoring

```bash
# Monitor Docker resource usage
docker stats

# Monitor system resources
top
htop
free -h
df -h

# Monitor network
netstat -tuln
ss -tuln
```

### Backup

```bash
# Backup database
docker-compose exec db pg_dump -U postgres fashion_prompt_builder > backup.sql

# Backup volumes
docker run --rm -v fashion-network_backend-logs:/data \
  -v $(pwd):/backup alpine tar czf /backup/logs-backup.tar.gz -C /data .

# Restore backup
docker-compose exec -T db psql -U postgres fashion_prompt_builder < backup.sql
```

### Updates

```bash
# Update dependencies
npm update

# Update Docker images
docker-compose pull

# Rebuild containers
docker-compose up -d --build

# Zero-downtime deployment
docker-compose up -d --no-deps --build backend
docker-compose up -d --no-deps --build frontend
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :5000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

#### 2. Docker Connection Issues

```bash
# Check Docker daemon
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check Docker logs
journalctl -u docker -f
```

#### 3. API Connection Errors

```bash
# Check if backend is running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Test API endpoint
curl -v http://localhost:5000/health

# Check network
docker network ls
docker network inspect fashion-network
```

#### 4. Memory Issues

```bash
# Check memory usage
docker stats

# Increase Docker memory limit
# Edit docker-compose.yml and add:
# mem_limit: 2g
# memswap_limit: 2g

# Restart containers
docker-compose restart
```

#### 5. SSL/TLS Errors

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Check certificate
openssl x509 -in cert.pem -text -noout

# Update certificate path in nginx.conf
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Enable verbose Docker output
docker-compose --verbose up

# Enable Node.js debugging
node --inspect=0.0.0.0:9229 server.js

# Browser DevTools
chrome://inspect
```

### Performance Optimization

```bash
# Enable gzip compression
# Already configured in nginx.conf

# Enable caching
# Already configured in nginx.conf

# Optimize images
# Use CDN for static assets

# Database indexing
# Create indexes on frequently queried fields

# Connection pooling
# Use connection pool for database
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker images
        run: docker-compose build
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push your-registry/backend:latest
          docker push your-registry/frontend:latest
      
      - name: Deploy to production
        run: |
          ssh -i ${{ secrets.DEPLOY_KEY }} user@host 'cd app && docker-compose pull && docker-compose up -d'
```

---

## Scaling

### Horizontal Scaling

```bash
# Scale backend service
docker-compose up -d --scale backend=3

# Use load balancer (nginx)
# Already configured in nginx.conf
```

### Vertical Scaling

```bash
# Increase container resources
# Edit docker-compose.yml:
# resources:
#   limits:
#     cpus: '2'
#     memory: 4G
```

---

## Security Checklist

- [ ] Update all dependencies
- [ ] Use HTTPS/SSL
- [ ] Set strong passwords
- [ ] Enable firewall
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Regular backups
- [ ] Security headers configured
- [ ] Input validation enabled
- [ ] SQL injection prevention
- [ ] XSS protection enabled
- [ ] CSRF tokens configured

---

## Support & Resources

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [GitHub Actions](https://github.com/features/actions)

---

**Last Updated:** 2024
**Version:** 1.0.0
