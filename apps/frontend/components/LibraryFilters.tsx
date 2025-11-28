'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FilterState {
  genre: string;
  year: string;
  decade: string;
  ratingMin: string;
  director: string;
  country: string;
  language: string;
  sort: string;
  order: string;
  watched: string;
  q: string;
}

export interface FilterOptions {
  genres: Array<{ id: number; name: string; count: number }>;
  years: number[];
  decades: number[];
  directors: string[];
  countries: string[];
  languages: string[];
  sortOptions: Array<{ value: string; label: string }>;
}

interface LibraryFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  isAuthenticated: boolean;
  hasMembership: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  genre: '',
  year: '',
  decade: '',
  ratingMin: '',
  director: '',
  country: '',
  language: '',
  sort: 'popular',
  order: 'desc',
  watched: '',
  q: '',
};

export function LibraryFilters({
  filters,
  onFilterChange,
  isAuthenticated,
  hasMembership,
}: LibraryFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch available filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch(`${API_URL}/api/content/filters`);
        const data = await response.json();
        if (data.success) {
          setFilterOptions(data.filters);
        }
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, []);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };

    // Clear year if decade is set and vice versa
    if (key === 'decade' && value) {
      newFilters.year = '';
    } else if (key === 'year' && value) {
      newFilters.decade = '';
    }

    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({ ...DEFAULT_FILTERS });
  };

  const hasActiveFilters = () => {
    return (
      filters.genre !== '' ||
      filters.year !== '' ||
      filters.decade !== '' ||
      filters.ratingMin !== '' ||
      filters.director !== '' ||
      filters.country !== '' ||
      filters.language !== '' ||
      filters.watched !== '' ||
      filters.q !== ''
    );
  };

  // Get active filter chips for display
  const getActiveFilterChips = () => {
    const chips: Array<{ label: string; key: keyof FilterState }> = [];

    if (filters.genre) {
      const genreName = filterOptions?.genres.find(g => g.id === parseInt(filters.genre))?.name;
      if (genreName) chips.push({ label: genreName, key: 'genre' });
    }
    if (filters.year) chips.push({ label: filters.year, key: 'year' });
    if (filters.decade) chips.push({ label: `${filters.decade}s`, key: 'decade' });
    if (filters.ratingMin) chips.push({ label: `${filters.ratingMin}+ rating`, key: 'ratingMin' });
    if (filters.director) chips.push({ label: `Dir: ${filters.director}`, key: 'director' });
    if (filters.country) chips.push({ label: filters.country, key: 'country' });
    if (filters.language) chips.push({ label: filters.language.toUpperCase(), key: 'language' });
    if (filters.watched === 'true') chips.push({ label: 'Watched', key: 'watched' });
    if (filters.watched === 'false') chips.push({ label: 'Unwatched', key: 'watched' });

    return chips;
  };

  if (loading) {
    return (
      <div className="mb-8 p-4 bg-blobbuster-navy/50 border border-neon-cyan/20 rounded-lg animate-pulse">
        <div className="h-10 bg-gray-700/50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Main Filter Bar */}
      <div className="p-4 bg-blobbuster-navy/50 border border-neon-cyan/20 rounded-lg">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Search movies, actors, directors..."
              value={filters.q}
              onChange={(e) => updateFilter('q', e.target.value)}
              className="w-full px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white placeholder-gray-500 focus:border-neon-cyan focus:outline-none"
            />
          </div>

          {/* Genre */}
          <select
            value={filters.genre}
            onChange={(e) => updateFilter('genre', e.target.value)}
            className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded font-bold text-blobbuster-gold focus:border-neon-cyan focus:outline-none"
          >
            <option value="" className="bg-blobbuster-navy text-white">All Genres</option>
            {filterOptions?.genres.map((g) => (
              <option key={g.id} value={g.id} className="bg-blobbuster-navy text-white">
                {g.name} ({g.count})
              </option>
            ))}
          </select>

          {/* Decade */}
          <select
            value={filters.decade}
            onChange={(e) => updateFilter('decade', e.target.value)}
            className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded font-bold text-blobbuster-gold focus:border-neon-cyan focus:outline-none"
          >
            <option value="" className="bg-blobbuster-navy text-white">All Decades</option>
            {filterOptions?.decades.map((d) => (
              <option key={d} value={d} className="bg-blobbuster-navy text-white">
                {d}s
              </option>
            ))}
          </select>

          {/* Rating */}
          <select
            value={filters.ratingMin}
            onChange={(e) => updateFilter('ratingMin', e.target.value)}
            className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded font-bold text-blobbuster-gold focus:border-neon-cyan focus:outline-none"
          >
            <option value="" className="bg-blobbuster-navy text-white">Any Rating</option>
            <option value="9" className="bg-blobbuster-navy text-white">9+ Excellent</option>
            <option value="8" className="bg-blobbuster-navy text-white">8+ Great</option>
            <option value="7" className="bg-blobbuster-navy text-white">7+ Good</option>
            <option value="6" className="bg-blobbuster-navy text-white">6+ Okay</option>
            <option value="5" className="bg-blobbuster-navy text-white">5+ Fair</option>
          </select>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded font-bold text-blobbuster-gold focus:border-neon-cyan focus:outline-none"
          >
            {filterOptions?.sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-blobbuster-navy text-white">
                {opt.label}
              </option>
            ))}
          </select>

          {/* More Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 rounded font-bold transition ${
              showAdvanced
                ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan'
                : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:border-neon-cyan/50'
            }`}
          >
            {showAdvanced ? 'Less Filters' : 'More Filters'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-3">
            {/* Year */}
            <select
              value={filters.year}
              onChange={(e) => updateFilter('year', e.target.value)}
              className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white focus:border-neon-cyan focus:outline-none"
            >
              <option value="">Any Year</option>
              {filterOptions?.years.slice(0, 30).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Director */}
            <select
              value={filters.director}
              onChange={(e) => updateFilter('director', e.target.value)}
              className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white focus:border-neon-cyan focus:outline-none"
            >
              <option value="">Any Director</option>
              {filterOptions?.directors.slice(0, 50).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Country */}
            <select
              value={filters.country}
              onChange={(e) => updateFilter('country', e.target.value)}
              className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white focus:border-neon-cyan focus:outline-none"
            >
              <option value="">Any Country</option>
              {filterOptions?.countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Language */}
            <select
              value={filters.language}
              onChange={(e) => updateFilter('language', e.target.value)}
              className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white focus:border-neon-cyan focus:outline-none"
            >
              <option value="">Any Language</option>
              {filterOptions?.languages.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Watch Status (only show if authenticated with membership) */}
            {isAuthenticated && hasMembership && (
              <select
                value={filters.watched}
                onChange={(e) => updateFilter('watched', e.target.value)}
                className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white focus:border-neon-cyan focus:outline-none"
              >
                <option value="">All Movies</option>
                <option value="false">Unwatched Only</option>
                <option value="true">Watched Only</option>
              </select>
            )}

            {/* Sort Order */}
            <select
              value={filters.order}
              onChange={(e) => updateFilter('order', e.target.value)}
              className="px-4 py-2 bg-blobbuster-navy border border-neon-cyan/20 rounded text-white focus:border-neon-cyan focus:outline-none"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400">Active filters:</span>
          {getActiveFilterChips().map((chip) => (
            <button
              key={chip.key}
              onClick={() => updateFilter(chip.key, '')}
              className="px-3 py-1 bg-neon-cyan/20 border border-neon-cyan/50 rounded-full text-sm text-neon-cyan flex items-center gap-1 hover:bg-neon-cyan/30 transition"
            >
              {chip.label}
              <span className="text-xs ml-1">×</span>
            </button>
          ))}
          <button
            onClick={clearAllFilters}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white transition"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange({ ...DEFAULT_FILTERS, sort: 'added', order: 'desc' })}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            filters.sort === 'added' && !hasActiveFilters()
              ? 'bg-neon-pink/20 border border-neon-pink text-neon-pink'
              : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:border-neon-pink/50'
          }`}
        >
          Recently Added
        </button>
        <button
          onClick={() => onFilterChange({ ...DEFAULT_FILTERS, sort: 'popular', order: 'desc' })}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            filters.sort === 'popular' && !filters.genre && !filters.decade && !filters.ratingMin
              ? 'bg-neon-pink/20 border border-neon-pink text-neon-pink'
              : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:border-neon-pink/50'
          }`}
        >
          Most Popular
        </button>
        <button
          onClick={() => onFilterChange({ ...DEFAULT_FILTERS, ratingMin: '8', sort: 'rating', order: 'desc' })}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${
            filters.ratingMin === '8'
              ? 'bg-neon-pink/20 border border-neon-pink text-neon-pink'
              : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:border-neon-pink/50'
          }`}
        >
          Highest Rated
        </button>
        {filterOptions?.decades.map((d) => (
          <button
            key={d}
            onClick={() => onFilterChange({ ...DEFAULT_FILTERS, decade: d.toString() })}
            className={`px-4 py-2 rounded-full text-sm font-bold transition ${
              filters.decade === d.toString()
                ? 'bg-neon-pink/20 border border-neon-pink text-neon-pink'
                : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:border-neon-pink/50'
            }`}
          >
            {d}s
          </button>
        ))}
      </div>
    </div>
  );
}

export { DEFAULT_FILTERS };
