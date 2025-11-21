#!/bin/bash

# Start Cloudflare Named Tunnel for Blockbuster Backend
# This tunnel provides a permanent URL: https://blockbuster.simp.wtf

echo "🚀 Starting Cloudflare Tunnel: blockbuster.simp.wtf"
echo ""
echo "This will expose your local backend (localhost:3001) to the internet"
echo "Press Ctrl+C to stop the tunnel"
echo ""

cloudflared tunnel --config ~/.cloudflared/config.yml run blockbuster
