'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleFont } from '@/editor/types';

interface FontDropdownProps {
  fonts: GoogleFont[];
  selectedFont: string;
  onFontChange: (fontFamily: string) => void;
  loadedFonts: Set<string>;
  onLoadFont: (fontFamily: string) => void;
}

export const FontDropdown: React.FC<FontDropdownProps> = ({
  fonts,
  selectedFont,
  onFontChange,
  loadedFonts,
  onLoadFont,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredFonts = fonts.filter(font =>
    font.family.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preload previews for the first few visible fonts when the dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    const preloadCount = 10;
    const toPreload = filteredFonts
      .slice(0, preloadCount)
      .map((f) => f.family)
      .filter((family) => !loadedFonts.has(family));
    toPreload.forEach(onLoadFont);
  }, [isOpen, search, filteredFonts, loadedFonts, onLoadFont]);

  const handleFontSelect = (fontFamily: string) => {
    onFontChange(fontFamily);
    onLoadFont(fontFamily);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:bg-gray-50 text-gray-900"
        style={{ fontFamily: loadedFonts.has(selectedFont) ? selectedFont : 'Inter' }}
      >
        <span className="block truncate">{selectedFont}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search fonts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
              autoFocus
            />
          </div>
          
          <div className="overflow-y-auto max-h-64">
            {filteredFonts.map((font) => (
              <button
                key={font.family}
                type="button"
                onClick={() => handleFontSelect(font.family)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                  selectedFont === font.family ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
                style={{ 
                  fontFamily: loadedFonts.has(font.family) ? font.family : 'Inter',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{font.family}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Inter' }}>
                  {font.category} • {font.variants?.length || 1} variant{(font.variants?.length || 1) !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
            
            {filteredFonts.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No fonts found matching &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
