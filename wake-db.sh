#!/bin/bash

# Database Wake-Up Script
# This script pings the backend health endpoint to wake up the database

BACKEND_URL="https://bedding-mega-zen-perl.trycloudflare.com"

echo "🔄 Waking up database..."
echo ""

# Make request to health endpoint
RESPONSE=$(curl -s "$BACKEND_URL/health")

# Check if successful
if echo "$RESPONSE" | grep -q '"database":"connected"'; then
  echo "✅ Database is awake and connected!"
  echo ""
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
else
  echo "⚠️  Database connection failed"
  echo ""
  echo "$RESPONSE"
fi

echo ""
echo "Backend URL: $BACKEND_URL/health"
