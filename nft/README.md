# Blockbuster NFT Card Generator

Experimental workspace for creating retro Blockbuster membership card NFTs.

## Structure

```
nft/
├── templates/     # Base card designs (PSD, PNG, SVG)
├── output/        # Generated card images
├── api/           # Image generation API
├── test.js        # Test script to generate sample cards
└── package.json   # Dependencies
```

## Features

- Generate personalized membership cards
- Active vs Expired states
- Dynamic member numbers
- Retro Blockbuster aesthetic

## Quick Start

```bash
cd nft
npm install
node test.js
```

This will generate sample cards in `output/`

## Design Options

1. **Canvas API** - Generate images programmatically
2. **Sharp** - Overlay text on template images
3. **SVG** - Dynamic vector graphics
4. **Puppeteer** - Render HTML/CSS as image

Currently using: **Sharp** (fast, simple, production-ready)
