'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Group, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import { TextLayer } from '@/editor/types';
import { useEditor } from '@/editor/store';

interface TextNodeProps {
  layer: TextLayer;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onTransform: (attrs: { x: number; y: number; width: number; height: number; rotation: number }) => void;
  onTransformEnd: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  setNodeRef?: (layerId: string, node: Konva.Group | null) => void;
}

export const TextNode: React.FC<TextNodeProps> = ({
  layer,
  isSelected,
  onSelect,
  onTransform,
  onTransformEnd,
  stageRef,
  setNodeRef,
}) => {
  const { selectedIds } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { updateLayer, commit } = useEditor();

  // Attach transformer when selected and register node ref
  useEffect(() => {
    const groupNode = groupRef.current;
    
    // Register/unregister node ref for group transforms
    if (setNodeRef) {
      setNodeRef(layer.id, groupNode);
    }

    if (isSelected && transformerRef.current && groupNode) {
      transformerRef.current.nodes([groupNode]);
      transformerRef.current.getLayer()?.batchDraw();
    }

    // Cleanup on unmount
    return () => {
      if (setNodeRef) {
        setNodeRef(layer.id, null);
      }
    };
  }, [isSelected, layer.id, setNodeRef]);

  // Handle double-click for text editing
  const handleDoubleClick = () => {
    if (!stageRef.current) return;

    setIsEditing(true);
    
    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    // Prefer textRef, fall back to groupRef (for warped text)
    const nodeForPos = textRef.current || groupRef.current;
    if (!nodeForPos) return;
    const absPos = nodeForPos.getAbsolutePosition();

    // Create textarea overlay
    const textarea = document.createElement('textarea');
    textarea.value = layer.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${stageBox.top + absPos.y * scale}px`;
    textarea.style.left = `${stageBox.left + absPos.x * scale}px`;
    const w = (textRef.current ? textRef.current.width() : layer.width) * scale;
    const h = (textRef.current ? textRef.current.height() : layer.height) * scale;
    textarea.style.width = `${w}px`;
    textarea.style.height = `${h}px`;
    textarea.style.fontSize = `${layer.fontSize * scale}px`;
    textarea.style.fontFamily = layer.fontFamily;
    textarea.style.fontWeight = layer.fontWeight.toString();
    textarea.style.color = layer.fill;
    textarea.style.textAlign = layer.align;
    textarea.style.border = '2px solid #4F46E5';
    textarea.style.borderRadius = '4px';
    textarea.style.outline = 'none';
    textarea.style.background = 'rgba(255, 255, 255, 0.9)';
    textarea.style.padding = '4px';
    textarea.style.resize = 'none';
    textarea.style.overflow = 'hidden';
    textarea.style.lineHeight = layer.lineHeight ? `${layer.lineHeight}` : '1.2';
    textarea.style.letterSpacing = layer.letterSpacing ? `${layer.letterSpacing}px` : 'normal';

    const handleBlur = () => {
      updateLayer(layer.id, { text: textarea.value });
      commit();
      document.body.removeChild(textarea);
      setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+Enter commits
      if ((e.key === 'Enter') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        textarea.blur();
      } else if (e.key === 'Escape') {
        document.body.removeChild(textarea);
        setIsEditing(false);
      }
    };

    // Allow multiline entry naturally; preserve whitespace
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('keydown', handleKeyDown);
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
  };

  const handleTransform = () => {
    if (!groupRef.current) return;

    const node = groupRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and update width/height instead
    node.scaleX(1);
    node.scaleY(1);

    onTransform({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  const handleDragEnd = () => {
    if (!groupRef.current) return;
    
    onTransform({
      x: groupRef.current.x(),
      y: groupRef.current.y(),
      width: layer.width,
      height: layer.height,
      rotation: groupRef.current.rotation(),
    });
    onTransformEnd();
  };

  return (
    <>
      <Group
        ref={groupRef}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        draggable={!layer.locked}
        dragBoundFunc={(pos) => {
          // Constrain dragging within the background image bounds
          const stage = stageRef.current;
          if (!stage) return pos;
          
          // Get background image dimensions from stage
          const bgWidth = stage.width() / stage.scaleX();
          const bgHeight = stage.height() / stage.scaleY();
          
          const maxX = bgWidth - layer.width;
          const maxY = bgHeight - layer.height;
          const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
          return {
            x: clamp(pos.x, 0, Math.max(0, maxX)),
            y: clamp(pos.y, 0, Math.max(0, maxY)),
          };
        }}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragMove={() => {
          if (!groupRef.current) return;
          onTransform({
            x: groupRef.current.x(),
            y: groupRef.current.y(),
            width: layer.width,
            height: layer.height,
            rotation: groupRef.current.rotation(),
          });
        }}
        onDragEnd={handleDragEnd}
        onTransform={handleTransform}
        onTransformEnd={onTransformEnd}
        opacity={isEditing ? 0.5 : 1}
        visible={layer.visible !== false}
      >
        {layer.warp?.type === 'arc' && layer.warp.radius > 0 ? (
          // Curved text rendering: position each character along an arc
          (() => {
            const dir = layer.warp?.direction === 'down' ? 1 : -1;
            const radius = layer.warp.radius;
            const extraSpacing = layer.warp.spacing ?? 0;
            const text = (layer.text || '').replace(/\n/g, ' ');
            // Measure widths using canvas
            const measures: number[] = [];
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
            }
            for (const ch of text) {
              const w = ctx ? ctx.measureText(ch).width : layer.fontSize * 0.6;
              measures.push(w + (layer.letterSpacing || 0) + extraSpacing);
            }
            const totalArc = measures.reduce((a, b) => a + b, 0) / radius; // radians
            let acc = 0;
            const cx = layer.width / 2;
            const cy = layer.height / 2 + dir * radius;
            return (
              <>
                {Array.from(text).map((ch, i) => {
                  const charArc = measures[i] / radius;
                  const angle = -totalArc / 2 + acc + charArc / 2; // center text
                  acc += charArc;
                  const x = cx + radius * Math.sin(angle) - measures[i] / 2;
                  const y = cy - dir * radius * Math.cos(angle) - layer.fontSize * 0.7; // approximate baseline
                  const rotation = (angle * 180) / Math.PI * dir;
                  return (
                    <Text
                      key={`${layer.id}-c${i}`}
                      text={ch}
                      x={x}
                      y={y}
                      rotation={rotation}
                      fontSize={layer.fontSize}
                      fontFamily={layer.fontFamily}
                      fontStyle={typeof layer.fontWeight === 'string' ? layer.fontWeight : 'normal'}
                      fill={layer.fill}
                      opacity={layer.opacity}
                      align={'center'}
                      width={measures[i]}
                      height={layer.fontSize * (layer.lineHeight || 1.2)}
                      shadowColor={layer.shadow?.color}
                      shadowBlur={layer.shadow?.blur}
                      shadowOffsetX={layer.shadow?.offsetX}
                      shadowOffsetY={layer.shadow?.offsetY}
                      listening
                      hitStrokeWidth={10}
                      draggable={false}
                    />
                  );
                })}
              </>
            );
          })()
        ) : (
          <Text
            ref={textRef}
            text={layer.text}
            fontSize={layer.fontSize}
            fontFamily={layer.fontFamily}
            fontStyle={typeof layer.fontWeight === 'string' ? layer.fontWeight : 'normal'}
            fill={layer.fill}
            opacity={layer.opacity}
            align={layer.align}
            width={layer.width}
            height={layer.height}
            lineHeight={layer.lineHeight || 1.2}
            letterSpacing={layer.letterSpacing || 0}
            shadowColor={layer.shadow?.color}
            shadowBlur={layer.shadow?.blur}
            shadowOffsetX={layer.shadow?.offsetX}
            shadowOffsetY={layer.shadow?.offsetY}
            listening
            // Improve click hit area slightly
            hitStrokeWidth={10}
            // Enable dragging on text itself
            draggable={false} // Let the Group handle dragging
          />
        )}
      </Group>

      {isSelected && !isEditing && selectedIds.length === 1 && (
        <Transformer
          ref={transformerRef}
          flipEnabled={false}
          rotateEnabled
          resizeEnabled
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
