'use client';

import { useState, useEffect, useRef } from 'react';

interface AvailableCategory {
  id: string;
  label: string;
  count: number;
  group: string;
}

interface CategorySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentCategoryId: string;
  availableCategories: AvailableCategory[];
  onSelect: (categoryId: string) => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function CategorySelector({
  isOpen,
  onClose,
  currentCategoryId,
  availableCategories,
  onSelect,
}: CategorySelectorProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group categories
  const generalCategories = availableCategories.filter(c => c.group === 'general');
  const decadeCategories = availableCategories.filter(c => c.group === 'decade');
  const genreCategories = availableCategories.filter(c => c.group === 'genre');
  const personalCategories = availableCategories.filter(c => c.group === 'personal');

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        ref={modalRef}
        className="bg-blobbuster-navy border border-neon-cyan/30 rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Select Category</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Categories List */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4">
          {/* General */}
          {generalCategories.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">General</h4>
              <div className="space-y-1">
                {generalCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                      cat.id === currentCategoryId
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-xs text-gray-500">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Decades */}
          {decadeCategories.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">By Decade</h4>
              <div className="space-y-1">
                {decadeCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                      cat.id === currentCategoryId
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-xs text-gray-500">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Genres */}
          {genreCategories.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">By Genre</h4>
              <div className="space-y-1">
                {genreCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                      cat.id === currentCategoryId
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-xs text-gray-500">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Personal */}
          {personalCategories.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Personal</h4>
              <div className="space-y-1">
                {personalCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelect(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                      cat.id === currentCategoryId
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {cat.count > 0 && <span className="text-xs text-gray-500">({cat.count})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
