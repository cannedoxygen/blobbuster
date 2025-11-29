'use client';

import { useRef, useState, useEffect } from 'react';

interface Movie {
  id: string;
  title: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  year?: number;
  externalRating?: number;
  watchedByUser?: boolean;
}

interface CategoryRowProps {
  categoryId: string;
  label: string;
  movies: Movie[];
  totalCount: number;
  onMovieClick: (movie: Movie) => void;
  onCategoryClick: (categoryId: string) => void;
  hasMembership?: boolean;
}

export function CategoryRow({
  categoryId,
  label,
  movies,
  totalCount,
  onMovieClick,
  onCategoryClick,
  hasMembership = false,
}: CategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll position to show/hide arrows
  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScrollPosition);
      return () => ref.removeEventListener('scroll', checkScrollPosition);
    }
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (movies.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Category Header - Clickable to open selector */}
      <div className="flex items-center justify-between mb-3 px-2">
        <button
          onClick={() => onCategoryClick(categoryId)}
          className="group flex items-center gap-2 text-lg font-bold text-white hover:text-neon-cyan transition-colors"
        >
          <span>{label}</span>
          <svg
            className="w-4 h-4 text-gray-400 group-hover:text-neon-cyan transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm text-gray-500 font-normal">({totalCount})</span>
        </button>
      </div>

      {/* Scrollable Row */}
      <div className="relative group/row">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-blobbuster-dark to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 bg-black/80 rounded-full flex items-center justify-center hover:bg-neon-cyan/20 hover:border-neon-cyan border border-gray-600 transition">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>
        )}

        {/* Movies Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => onMovieClick(movie)}
              className="flex-shrink-0 w-36 sm:w-40 md:w-44 cursor-pointer group/card"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 mb-2 ring-2 ring-transparent group-hover/card:ring-neon-cyan transition-all duration-200 group-hover/card:scale-105">
                {movie.posterUrl || movie.thumbnailUrl ? (
                  <img
                    src={movie.posterUrl || movie.thumbnailUrl || ''}
                    alt={movie.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}

                {/* Rating Badge */}
                {movie.externalRating && (
                  <div className="absolute top-2 left-2 bg-black/80 text-blobbuster-gold text-xs font-bold px-2 py-1 rounded">
                    {movie.externalRating.toFixed(1)}
                  </div>
                )}

                {/* Watched Badge */}
                {hasMembership && movie.watchedByUser !== undefined && (
                  movie.watchedByUser ? (
                    <div className="absolute bottom-2 right-2 bg-green-600/90 text-white text-xs font-bold px-2 py-1 rounded">
                      Played
                    </div>
                  ) : (
                    <div className="absolute bottom-2 right-2 bg-neon-cyan/80 text-black text-xs font-bold px-2 py-1 rounded">
                      Unplayed
                    </div>
                  )
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 bg-neon-pink/80 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-sm text-white font-medium truncate group-hover/card:text-neon-cyan transition-colors">
                {movie.title}
              </h3>
              {movie.year && (
                <p className="text-xs text-gray-500">{movie.year}</p>
              )}
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-blobbuster-dark to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 bg-black/80 rounded-full flex items-center justify-center hover:bg-neon-cyan/20 hover:border-neon-cyan border border-gray-600 transition">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
