'use client';

import React from 'react';
import { Line, Text as KonvaText } from 'react-konva';
import { useEditor } from '@/editor/store';

export const Guides: React.FC = () => {
  const { bg, activeGuides } = useEditor();

  if (!bg) return null;
  if (!activeGuides || activeGuides.length === 0) return null;

  return (
    <>
      {activeGuides.map((g, idx) => {
        const isVertical = g.type === 'vertical';
        const points = g.from && g.to
          ? [g.from.x, g.from.y, g.to.x, g.to.y]
          : isVertical
            ? [g.position, 0, g.position, bg.height]
            : [0, g.position, bg.width, g.position];

        // Compute label position if provided
        const labelX = g.from && g.to ? (g.from.x + g.to.x) / 2 : (isVertical ? g.position + 4 : 4);
        const labelY = g.from && g.to ? (g.from.y + g.to.y) / 2 : (isVertical ? 4 : g.position + 4);

        return (
          <React.Fragment key={idx}>
            <Line
              points={points}
              stroke="#6366F1"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
            {g.label && (
              <KonvaText
                x={labelX}
                y={labelY}
                text={g.label}
                fontSize={12}
                fill="#374151"
                listening={false}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
