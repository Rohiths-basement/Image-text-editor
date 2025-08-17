'use client';

import React, { useState } from 'react';
import { useEditor } from '@/editor/store';
import type { TextLayer } from '@/editor/types';

export const ExportButton: React.FC = () => {
  const { bg, layers } = useEditor();
  const [isExporting, setIsExporting] = useState(false);

  const exportPNG = async () => {
    if (!bg) {
      alert('Please upload a background image first.');
      return;
    }

    if (layers.length === 0) {
      alert('Please add some text layers before exporting.');
      return;
    }

    setIsExporting(true);

    try {
      // Create an off-screen canvas for export
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas to original image dimensions
      canvas.width = bg.width;
      canvas.height = bg.height;

      // Load and draw background image
      const bgImage = new Image();
      bgImage.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        bgImage.onload = () => resolve();
        bgImage.onerror = () => reject(new Error('Failed to load background image'));
        bgImage.src = bg.src;
      });

      // Draw background
      ctx.drawImage(bgImage, 0, 0, bg.width, bg.height);

      // Draw text layers in order (bottom to top)
      for (const layer of layers) {
        await drawTextLayer(ctx, layer);
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `design-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const drawTextLayer = async (ctx: CanvasRenderingContext2D, layer: TextLayer) => {
    // Save context state
    ctx.save();

    // Apply transformations
    ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-layer.width / 2, -layer.height / 2);

    // Set text properties
    ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.fillStyle = layer.fill;
    ctx.globalAlpha = layer.opacity;
    ctx.textAlign = layer.align;
    ctx.textBaseline = 'top';

    // Handle text shadow if present
    if (layer.shadow) {
      ctx.shadowColor = layer.shadow.color;
      ctx.shadowBlur = layer.shadow.blur;
      ctx.shadowOffsetX = layer.shadow.offsetX;
      ctx.shadowOffsetY = layer.shadow.offsetY;
    }

    // Calculate text position based on alignment
    let textX = 0;
    if (layer.align === 'center') {
      textX = layer.width / 2;
    } else if (layer.align === 'right') {
      textX = layer.width;
    }

    // Split text into lines and draw each line
    const lines = layer.text.split('\n');
    const lineHeight = layer.fontSize * (layer.lineHeight || 1.2);
    
    lines.forEach((line: string, index: number) => {
      const y = index * lineHeight;
      ctx.fillText(line, textX, y);
    });

    // Restore context state
    ctx.restore();
  };

  return (
    <button
      onClick={exportPNG}
      disabled={!bg || isExporting}
      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
    >
      {isExporting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Exporting...</span>
        </>
      ) : (
        <span>Export PNG</span>
      )}
    </button>
  );
};
