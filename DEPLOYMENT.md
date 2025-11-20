# Blockbuster Deployment Guide

## 🚀 Deployment Architecture

- **Frontend**: Deployed to Vercel
- **Backend**: Running locally (will be exposed via tunnel)
- **Database**: PostgreSQL (local)
- **Blockchain**: Sui Mainnet
- **Storage**: Walrus Mainnet

## 📦 Vercel Frontend Deployment

### 1. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import from GitHub: `cannedoxygen/blockbuster`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 2. Environment Variables

Add these environment variables in Vercel Dashboard (Settings → Environment Variables):

```bash
NEXT_PUBLIC_API_URL=https://YOUR_TUNNEL_URL
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
NEXT_PUBLIC_MEMBERSHIP_PACKAGE=0x75a3d6b0405b74c9ee4af7ec299e7f26908a106cc20027ede0aa10b1988d7ad7
NEXT_PUBLIC_MEMBER_REGISTRY=0x3766a4137c04b81a30a798996dade6498bd530901624984c1bdf8a8f020b551b
NEXT_PUBLIC_REVENUE_POOL=0x569e668d75d61f6b5485dcbc5233834c8a13117f6233c50fc52e6222d7abeee1
NEXT_PUBLIC_CONTENT_REGISTRY=0xbb07863bcdde54c70dcde8e6e6423327023c6dc3d59f6df1d8e7476fa60558f7
NEXT_PUBLIC_PLATFORM_WALLET=0xdeb24a3a025e4be1cb4371435f1db978b4f4f8b2526621035470d45c80060231
```

**Note**: You'll need to update `NEXT_PUBLIC_API_URL` after setting up the tunnel in step 3.

### 3. Expose Local Backend

Since the backend runs locally, you need to expose it to the internet:

#### Option A: Ngrok (Recommended)

```bash
# Install ngrok
brew install ngrok

# Or download from https://ngrok.com/download

# Authenticate (get token from ngrok.com)
ngrok authtoken YOUR_NGROK_TOKEN

# Expose backend (port 3001)
ngrok http 3001
```

You'll get a URL like: `https://abc123.ngrok.io`

#### Option B: Cloudflare Tunnel (Free, More Stable)

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Login
cloudflared login

# Create tunnel
cloudflared tunnel create blockbuster-backend

# Expose backend
cloudflared tunnel --url http://localhost:3001
```

You'll get a URL like: `https://blockbuster-backend.trycloudflare.com`

### 4. Update Vercel Environment Variables

1. Copy your tunnel URL (e.g., `https://abc123.ngrok.io`)
2. Go to Vercel Dashboard → Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` with your tunnel URL
4. Redeploy: Deployments → ... → Redeploy

### 5. Update Backend CORS

Update your local `.env` file:

```bash
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

Restart your backend server.

## 🔧 Local Development

### Backend
```bash
cd apps/backend
npm run dev
```

### Frontend
```bash
cd apps/frontend
npm run dev
```

## 📝 Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend exposed via tunnel
- [ ] Environment variables set in Vercel
- [ ] CORS configured for Vercel domain
- [ ] Test membership purchase flow
- [ ] Test video upload
- [ ] Test video playback
- [ ] Test referral code system

## 🐛 Troubleshooting

### "Failed to fetch" errors
- Check that tunnel is running
- Verify `NEXT_PUBLIC_API_URL` in Vercel matches tunnel URL
- Check backend CORS settings

### Video not playing
- Ensure Walrus URLs are accessible
- Check blob proxy endpoint is working
- Verify content is active in database

### Membership purchase fails
- Check Sui wallet connection
- Verify contract addresses in environment variables
- Check backend logs for errors

## 🔐 Security Notes

- Never commit `.env` files
- Rotate secrets regularly
- Use HTTPS for all endpoints
- Keep dependencies updated

---

Built by Canned Oxygen
