# Blockbuster Frontend

Next.js 14 frontend application for the Blockbuster decentralized streaming platform.

## Features

- 80s Blockbuster aesthetic design
- Sui wallet integration (@mysten/wallet-kit)
- Video streaming (Video.js)
- NFT membership management
- Creator dashboard
- Real-time analytics

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Blockchain**: @mysten/dapp-kit, @mysten/wallet-kit
- **Video Player**: Video.js
- **Animations**: Framer Motion

## Project Structure

```
apps/frontend/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Homepage
│   ├── library/               # Content library
│   │   └── page.tsx
│   ├── watch/[id]/            # Video player
│   │   └── page.tsx
│   ├── membership/            # Purchase membership
│   │   └── page.tsx
│   └── uploader/              # Creator dashboard
│       └── page.tsx
├── components/                 # React components
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   └── features/              # Feature-specific components
│       ├── VideoPlayer.tsx
│       ├── MembershipCard.tsx
│       └── ContentCard.tsx
├── lib/                        # Utilities and services
│   ├── api.ts                 # API client
│   ├── sui.ts                 # Sui blockchain utilities
│   └── constants.ts           # App constants
├── styles/                     # Global styles
│   └── globals.css
└── public/                     # Static assets
```

## Development

### Prerequisites

- Node.js 20+
- Backend API running (see apps/backend)

### Installation

```bash
cd apps/frontend
npm install
```

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_MEMBERSHIP_PACKAGE=0x...
NEXT_PUBLIC_MEMBER_REGISTRY=0x...
NEXT_PUBLIC_REVENUE_POOL=0x...
NEXT_PUBLIC_CONTENT_REGISTRY=0x...
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Pages

### Homepage (`/`)
- Hero section with animated grid background
- Membership tier cards
- Featured content carousel
- Platform statistics
- CTA to connect wallet

### Library (`/library`)
- Browse all available content
- Genre filters
- Search functionality
- Grid/list view toggle
- Infinite scroll pagination

### Video Player (`/watch/[id]`)
- Full-screen video player
- Quality selector (480p, 720p, 1080p, 4K)
- Playback controls
- Related content sidebar
- Progress tracking

### Membership (`/membership`)
- Tier comparison table
- Purchase flow
- Current membership display
- Renewal option

### Uploader Dashboard (`/uploader`)
- Earnings overview
- Content analytics
- Upload new content
- Content management

## Components

### UI Components

**Button.tsx**
```tsx
<Button variant="primary" size="lg">
  Connect Wallet
</Button>
```

**Card.tsx**
```tsx
<Card hover glow>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

**Modal.tsx**
```tsx
<Modal isOpen={true} onClose={() => {}}>
  Modal content
</Modal>
```

### Feature Components

**VideoPlayer.tsx**
- Video.js integration
- HLS streaming support
- Progress tracking
- Quality selection

**MembershipCard.tsx**
- Tier information display
- Purchase button
- Benefits list
- Pricing

**ContentCard.tsx**
- Movie poster
- Title, rating, duration
- Play button
- Add to watchlist

## Wallet Integration

### Setup

```tsx
// app/providers.tsx
import { WalletKitProvider } from '@mysten/wallet-kit';
import { SuiClientProvider } from '@mysten/dapp-kit';

export function Providers({ children }) {
  return (
    <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
      <WalletKitProvider>
        {children}
      </WalletKitProvider>
    </SuiClientProvider>
  );
}
```

### Usage

```tsx
import { useCurrentAccount } from '@mysten/dapp-kit';

function Component() {
  const account = useCurrentAccount();

  return (
    <div>
      {account ? `Connected: ${account.address}` : 'Not connected'}
    </div>
  );
}
```

## Styling

### Tailwind Classes

```tsx
// Blockbuster blue background
<div className="bg-blockbuster-blue" />

// Neon text effect
<h1 className="text-neon-pink animate-neon-pulse" />

// Grid background
<div className="bg-grid-pattern bg-grid-bg" />
```

### Custom Animations

```tsx
// Pulsing neon effect
<button className="animate-neon-pulse">
  Join Now
</button>

// Moving grid
<div className="animate-grid-move">
  Grid background
</div>
```

## API Integration

```tsx
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export async function getContent(params) {
  const { data } = await api.get('/api/content', { params });
  return data;
}
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```bash
# Build
docker build -t blockbuster-frontend .

# Run
docker run -p 3000:3000 blockbuster-frontend
```

## Performance Optimization

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic via Next.js
- **Static Generation**: Pre-render pages where possible
- **CDN**: Deploy to Vercel Edge Network
- **Bundle Analysis**: `npm run analyze`

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast (WCAG AA)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Sui Wallet Kit](https://sdk.mystenlabs.com/wallet-kit)
- [Video.js Documentation](https://docs.videojs.com/)
