'use client';

import React, { useRef } from 'react';

// Minimal typings for the EyeDropper API to avoid using `any`
type EyeDropperResult = { sRGBHex: string };
type EyeDropper = { open: () => Promise<EyeDropperResult> };
declare global {
  interface Window {
    EyeDropper?: new () => EyeDropper;
  }
}

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onCommit?: () => void;
  swatches?: string[];
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  onCommit,
  swatches = [],
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEyedropper = async () => {
    try {
      // Check if EyeDropper API is available
      if (window.EyeDropper) {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        onChange(result.sRGBHex);
        onCommit?.();
      } else {
        // Fallback: show message or use alternative method
        alert('Eyedropper not supported in this browser. Please use Chrome 95+ or Edge 95+');
      }
    } catch (error) {
      // User cancelled or error occurred
      console.log('Eyedropper cancelled or failed:', error);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Color input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
        />
      </div>

      {/* Hex input */}
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const color = e.target.value;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(color)) {
            onChange(color);
          }
        }}
        onBlur={onCommit}
        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded font-mono"
        placeholder="#000000"
      />

      {/* Eyedropper button */}
      <button
        type="button"
        onClick={handleEyedropper}
        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title="Pick color from screen"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3V1m0 18v2m8-10h2m-2 0h2m-2 0v2m0-2v-2" />
        </svg>
      </button>

      {/* Color swatches */}
      {swatches.length > 0 && (
        <div className="flex space-x-1">
          {swatches.slice(0, 6).map((swatch, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onChange(swatch);
                onCommit?.();
              }}
              className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
        </div>
      )}
    </div>
  );
};
