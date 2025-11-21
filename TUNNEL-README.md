# Cloudflare Tunnel Setup

Your backend is now accessible via a **permanent tunnel URL**:

## 🌐 Production URL
```
https://blockbuster.simp.wtf
```

This URL **never changes** - even when you restart your computer or the tunnel!

---

## 🚀 How to Start the Backend

You need to run **TWO** processes:

### 1. Start Backend Server
```bash
cd apps/backend
npm run dev
```
This starts your Express server on `localhost:3001`

### 2. Start Cloudflare Tunnel (in a separate terminal)
```bash
./start-tunnel.sh
```
Or manually:
```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run blockbuster
```

This exposes your local backend to the internet at `https://blockbuster.simp.wtf`

---

## ✅ Verify Everything Works

1. **Check backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","database":"connected",...}`

2. **Check tunnel is working:**
   ```bash
   curl https://blockbuster.simp.wtf/health
   ```
   Should return the same response

3. **Check frontend can reach backend:**
   - Go to: `https://frontend-navy-zeta-98.vercel.app`
   - Should load the library with all movies

---

## 📋 Quick Start Commands

Open **two terminal windows**:

**Terminal 1 - Backend:**
```bash
cd /Users/cannedoxygen/Downloads/buster/apps/backend
npm run dev
```

**Terminal 2 - Tunnel:**
```bash
cd /Users/cannedoxygen/Downloads/buster
./start-tunnel.sh
```

---

## 🔧 Troubleshooting

### Tunnel not connecting
```bash
# Check if tunnel exists
cloudflared tunnel list

# Should show:
# ID: 95690a6b-82a7-4120-9bc3-3d197b655c0e
# NAME: blockbuster
```

### Backend not reachable
1. Make sure backend is running on `localhost:3001`
2. Make sure tunnel is running
3. Check tunnel logs for errors

### Frontend getting CORS errors
The backend CORS is already configured to allow:
- `*.vercel.app` domains
- `blockbuster.simp.wtf`

---

## 🗂️ Files Created

- `~/.cloudflared/config.yml` - Tunnel configuration
- `~/.cloudflared/cert.pem` - Your Cloudflare credentials (keep secret!)
- `~/.cloudflared/95690a6b-82a7-4120-9bc3-3d197b655c0e.json` - Tunnel credentials
- `start-tunnel.sh` - Convenient startup script

---

## ℹ️ Important Notes

- **The tunnel URL never changes** - `https://blockbuster.simp.wtf` is permanent
- **You must keep the tunnel running** for your frontend to work
- **The backend must be running** for the tunnel to forward requests
- **Don't commit** the `.cloudflared` directory to git (already in .gitignore)
