'use client';

interface MovieOption {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  year?: number;
  posterUrl?: string;
  plot?: string;
  rating?: number;
}

interface MovieSelectionModalProps {
  isOpen: boolean;
  movies: MovieOption[];
  onSelect: (movie: MovieOption) => void;
  onClose: () => void;
}

export function MovieSelectionModal({ isOpen, movies, onSelect, onClose }: MovieSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Multiple Matches Found</h2>
        <p className="text-gray-300 mb-6">Select the correct movie from the results below:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {movies.map((movie) => (
            <button
              key={movie.tmdbId}
              onClick={() => onSelect(movie)}
              className="flex gap-4 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors border-2 border-transparent hover:border-yellow-400"
            >
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-24 h-36 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-36 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 text-xs text-center">No Poster</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{movie.title}</h3>
                {movie.year && (
                  <p className="text-yellow-400 text-sm mb-2">({movie.year})</p>
                )}
                {movie.plot && (
                  <p className="text-gray-300 text-sm line-clamp-3 mb-2">{movie.plot}</p>
                )}
                {movie.rating && (
                  <div className="flex items-center gap-1 text-yellow-400 text-sm">
                    <span>⭐</span>
                    <span>{movie.rating.toFixed(1)}/10</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
