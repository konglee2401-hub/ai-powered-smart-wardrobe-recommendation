# ⚡ QUICKSTART - 5 Minutes Setup

## Prerequisites
- Node.js 18+
- MongoDB running locally
- At least ONE API key (Gemini is FREE)

## Step 1: Clone & Install (2 min)

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Step 2: Configure (1 min)

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/fashion-ai
GOOGLE_API_KEY=your_gemini_key_here
```

Get FREE Gemini key: https://makersuite.google.com/app/apikey

## Step 3: Seed Database (30 sec)

```bash
cd backend
npm run seed-options
```

Expected output:
```
✅ Seeding complete!
   Added: 53 options
```

## Step 4: Start (1 min)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 5: Use (30 sec)

1. Open http://localhost:5173
2. Upload character + product images
3. Click "Analyze Images with AI"
4. Click "Generate Images with AI"
5. Done! 🎉

---

## Troubleshooting

**"No options in dropdown"**
```bash
cd backend
npm run seed-options
```

**"Analysis failed"**
- Check API key in .env
- Test: `npm run test:gemini`

**"Cannot connect to MongoDB"**
```bash
# Start MongoDB
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 mongo
```

---

## Next Steps

- Add more API keys for fallback
- Configure image generation providers
- Read full README.md for advanced features
