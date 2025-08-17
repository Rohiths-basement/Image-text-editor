'use client';

import { useEffect } from 'react';
import { useEditor } from '@/editor/store';

export const useKeyboardShortcuts = () => {
  const {
    undo,
    redo,
    selectedIds,
    deleteLayer,
    duplicateLayer,
    addTextLayer,
  } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Cmd/Ctrl + Z
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if (cmdOrCtrl && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach(id => deleteLayer(id));
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if (cmdOrCtrl && e.key === 'd' && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach(id => duplicateLayer(id));
        return;
      }

      // Add Text: T key
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        addTextLayer();
        return;
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        e.preventDefault();
        // This will be handled by the canvas component
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedIds, deleteLayer, duplicateLayer, addTextLayer]);
};
