'use client';

import React from 'react';
import { useEditor } from '@/editor/store';

export const HistoryIndicator: React.FC = () => {
  const { history, undo, redo } = useEditor();

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const undoCount = history.past.length;
  const redoCount = history.future.length;

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Undo (Cmd+Z)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        <span className="font-mono tabular-nums">{undoCount}</span>
      </button>

      <div className="w-px h-4 bg-gray-300" />

      <button
        onClick={redo}
        disabled={!canRedo}
        className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Redo (Cmd+Shift+Z)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </svg>
        <span className="font-mono tabular-nums">{redoCount}</span>
      </button>

      {(history.past.length + history.future.length) > 0 && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <span className="text-xs text-gray-500">
            {history.past.length + history.future.length + 1} states
          </span>
        </>
      )}
    </div>
  );
};
