'use client';

import React from 'react';
import { useEditor } from '@/editor/store';
import { TextLayer } from '@/editor/types';

interface LayerItemProps {
  layer: TextLayer;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onToggleLock,
  canMoveUp,
  canMoveDown,
}) => {
  return (
    <div
      className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {layer.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {layer.text.substring(0, 30)}
            {layer.text.length > 30 ? '...' : ''}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            className={`p-1 hover:text-gray-600 ${layer.visible === false ? 'text-gray-300' : 'text-gray-500'}`}
            title={layer.visible === false ? "Show layer - Click to make this layer visible on the canvas" : "Hide layer - Click to hide this layer from the canvas"}
          >
            {layer.visible === false ? '👁️‍🗨️' : '👁️'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            className={`p-1 hover:text-gray-600 ${layer.locked ? 'text-amber-500' : 'text-gray-400'}`}
            title={layer.locked ? "Unlock layer - Click to enable dragging and editing" : "Lock layer - Click to prevent dragging and editing"}
          >
            {layer.locked ? '🔒' : '🔓'}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up - Move this layer higher in the stack (appears on top)"
          >
            ↑
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down - Move this layer lower in the stack (appears behind)"
          >
            ↓
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Duplicate - Create a copy of this layer"
          >
            ⧉
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Delete - Remove this layer permanently"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export const LayersPanel: React.FC = () => {
  const {
    layers,
    selectedIds,
    selectLayers,
    deleteLayer,
    duplicateLayer,
    reorderLayers,
    updateLayer,
    commit,
  } = useEditor();

  const handleLayerSelect = (layerId: string) => {
    selectLayers([layerId]);
  };

  const handleLayerDelete = (layerId: string) => {
    deleteLayer(layerId);
  };

  const handleLayerDuplicate = (layerId: string) => {
    duplicateLayer(layerId);
  };

  const handleMoveUp = (layerId: string) => {
    const currentIndex = layers.findIndex(l => l.id === layerId);
    if (currentIndex < layers.length - 1) {
      const newOrder = [...layers];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      reorderLayers(newOrder.map(l => l.id));
      commit();
    }
  };

  const handleMoveDown = (layerId: string) => {
    const currentIndex = layers.findIndex(l => l.id === layerId);
    if (currentIndex > 0) {
      const newOrder = [...layers];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      reorderLayers(newOrder.map(l => l.id));
      commit();
    }
  };

  const handleToggleVisibility = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updateLayer(layerId, { visible: layer.visible === false ? true : false });
    }
  };

  const handleToggleLock = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updateLayer(layerId, { locked: !layer.locked });
    }
  };

  // Reverse layers for display (top to bottom = front to back)
  const displayLayers = [...layers].reverse();

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Layers</h2>
        <p className="text-sm text-gray-500 mt-1">
          {layers.length} layer{layers.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {displayLayers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No layers yet.</p>
            <p className="text-sm mt-1">Upload an image and add some text!</p>
          </div>
        ) : (
          displayLayers.map((layer, displayIndex) => {
            const actualIndex = layers.length - 1 - displayIndex;
            return (
              <LayerItem
                key={layer.id}
                layer={layer}
                isSelected={selectedIds.includes(layer.id)}
                onSelect={() => handleLayerSelect(layer.id)}
                onDelete={() => handleLayerDelete(layer.id)}
                onDuplicate={() => handleLayerDuplicate(layer.id)}
                onMoveUp={() => handleMoveUp(layer.id)}
                onMoveDown={() => handleMoveDown(layer.id)}
                onToggleVisibility={() => handleToggleVisibility(layer.id)}
                onToggleLock={() => handleToggleLock(layer.id)}
                canMoveUp={actualIndex < layers.length - 1}
                canMoveDown={actualIndex > 0}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
