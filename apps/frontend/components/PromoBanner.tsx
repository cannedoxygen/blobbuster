'use client';

export default function PromoBanner() {
  // PROMO: Free memberships Jan 23 - Feb 28, 2026
  const PROMO_START = new Date('2026-01-23T00:00:00Z');
  const PROMO_END = new Date('2026-02-28T23:59:59Z');

  const isPromoActive = () => {
    const now = new Date();
    return now >= PROMO_START && now <= PROMO_END;
  };

  if (!isPromoActive()) return null;

  const message = "FREE MEMBERSHIP through February 28, 2026";

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white py-2">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      <div className="relative flex animate-marquee whitespace-nowrap">
        {[...Array(8)].map((_, i) => (
          <span key={i} className="mx-8 text-sm font-bold tracking-wide">
            {message}
            <span className="mx-4 opacity-50">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
