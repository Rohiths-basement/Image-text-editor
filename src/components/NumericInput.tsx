'use client';

import React, { useState, useRef, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  suffix?: string;
  className?: string;
  disabled?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  onCommit,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision = 0,
  suffix = '',
  className = '',
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState(value.toFixed(precision));
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(value.toFixed(precision));
    }
  }, [value, precision, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      return;
    }

    if (e.key === 'Escape') {
      setDisplayValue(value.toFixed(precision));
      setIsEditing(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const direction = e.key === 'ArrowUp' ? 1 : -1;
      const stepSize = e.shiftKey ? step * 10 : step;
      const newValue = Math.max(min, Math.min(max, value + (direction * stepSize)));
      onChange(newValue);
      onCommit?.();
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    inputRef.current?.select();
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(displayValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
      setDisplayValue(clampedValue.toFixed(precision));
    } else {
      setDisplayValue(value.toFixed(precision));
    }
    onCommit?.();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={`
          w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 placeholder:text-gray-500
          focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-right font-mono tabular-nums
          ${suffix ? 'pr-8' : ''}
          ${className}
        `}
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
};
