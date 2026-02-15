# N8N Automation Setup

## Quick Start

### 1. Start N8N

```bash
cd n8n
docker-compose up -d
```

### 2. Access N8N

- URL: http://localhost:5678
- Username: admin
- Password: smartwardrobe2024

### 3. Import Workflows

1. Open N8N UI
2. Click "Workflows" → "Import from File"
3. Select workflow JSON files from `workflows/` folder

### 4. Test Workflow

```bash
# Test webhook
curl -X POST http://localhost:5678/webhook/ai-fashion-video \
  -H "Content-Type: application/json" \
  -d '{
    "characterImage": "base64_string_here",
    "productImage": "base64_string_here",
    "options": {
      "customPrompt": "A young Vietnamese woman wearing elegant dress",
      "imageCount": 2
    }
  }'
```

## Workflows

### 1. `ai-fashion-video-workflow.json`
Complete automation: Upload → Analysis → Generate Images → Generate Video

### 2. `image-generation-only.json`
Image generation only (faster testing)

## Monitoring

- View executions: http://localhost:5678/executions
- Check logs: `docker-compose logs -f n8n`

## Troubleshooting

### N8N can't connect to Express API

```bash
# Check if Express is running
curl http://localhost:5000/api/health

# Check N8N logs
docker-compose logs n8n

# Restart N8N
docker-compose restart n8n
```

### Webhook not working

1. Make sure workflow is activated
2. Check webhook URL in workflow settings
3. Test with curl command above

## Stop N8N

```bash
docker-compose down

# Stop and remove volumes
docker-compose down -v
```
