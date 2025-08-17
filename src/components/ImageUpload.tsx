'use client';

import React, { useRef } from 'react';
import { useEditor } from '@/editor/store';

interface ImageUploadProps {
  onUpload?: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setBg } = useEditor();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/png')) {
      alert('Please select a PNG image file.');
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      alert('File size must be less than 20MB.');
      return;
    }

    try {
      const dataURL = await readFileAsDataURL(file);
      const { width, height } = await getImageDimensions(dataURL);

      // Validate dimensions (8K limit)
      if (width > 8000 || height > 8000) {
        alert('Image dimensions must be less than 8000px on either axis.');
        return;
      }

      setBg({ src: dataURL, width, height });
      onUpload?.();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = src;
    });
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={triggerUpload}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Upload PNG
      </button>
    </>
  );
};
