"use client";

import React, { useState, useCallback, memo, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut } from 'lucide-react';

export default memo(function CropperModal({
  isOpen,
  cropType,
  imageSrc,
  onCancel,
  onDone,
  isProcessing,
}: {
  isOpen: boolean;
  cropType: 'avatar' | 'banner' | 'post';
  imageSrc: string | null;
  onCancel: () => void;
  onDone: (croppedAreaPixels: any) => void;
  isProcessing?: boolean;
}) {
  // Isolate viewport state to prevent global re-renders during gesture interactions
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Re-initialize zoom and crop vectors on active frame switch
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [isOpen, imageSrc]);

  // Defer state updates to avoid synchronous mounting errors
  const handleCropChange = useCallback((newCrop: { x: number; y: number }) => {
    requestAnimationFrame(() => setCrop(newCrop));
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    requestAnimationFrame(() => setZoom(newZoom));
  }, []);

  const onCropCompleteHandler = useCallback((_: any, croppedPixels: any) => {
    requestAnimationFrame(() => setCroppedAreaPixels(croppedPixels));
  }, []);

  const handleDoneClick = () => {
    if (croppedAreaPixels) {
      onDone(croppedAreaPixels);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col pointer-events-auto select-none touch-none overflow-hidden">
      {/* Modal Title and Action Bar */}
      <div className="flex justify-between items-center p-4 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-10 shrink-0">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className={`text-white text-sm font-semibold transition-transform ${
            isProcessing ? 'opacity-50 pointer-events-none' : 'active:scale-95'
          }`}
        >
          Cancel
        </button>
        <h2 className="font-bold text-base tracking-tight text-white">
          Crop {cropType === 'avatar' ? 'Photo' : cropType === 'banner' ? 'Banner' : 'Post'}
        </h2>
        <button
          onClick={handleDoneClick}
          disabled={isProcessing || !croppedAreaPixels}
          className={`text-[#4fa8ff] font-bold text-sm flex items-center gap-2 transition-transform ${
            isProcessing ? 'opacity-70 pointer-events-none' : 'active:scale-95'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            'Done'
          )}
        </button>
      </div>

      {/* Image Manipulation Canvas */}
      <div className="relative flex-1 bg-black w-full h-full touch-none overflow-hidden will-change-transform">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={cropType === 'avatar' ? 1 : cropType === 'banner' ? 21 / 9 : 4 / 5}
            cropShape={cropType === 'avatar' ? 'round' : 'rect'}
            showGrid={false}
            onCropChange={handleCropChange}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={handleZoomChange}
            minZoom={1}
            maxZoom={4}
            zoomSpeed={0.8}
            restrictPosition={true}
            objectFit="contain"
            style={{
              containerStyle: {
                width: '100vw', // Override default container constraints for edge-to-edge layout
                height: '100%',
                backgroundColor: '#000',
                touchAction: 'none', 
              },
              cropAreaStyle: {
                border: '2px solid rgba(79, 168, 255, 0.8)',
                // Generate synthetic overlay using extended box-shadow radius
                boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.85)', 
              },
            }}
          />
        )}
      </div>

      {/* Viewport scale controls for fine adjustment */}
      <div className="p-4 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800 flex items-center justify-center gap-4 shrink-0 z-10">
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
          className="text-zinc-400 hover:text-white transition-colors active:scale-90"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <input
          type="range"
          value={zoom}
          min={1}
          max={4}
          step={0.05}
          aria-label="Zoom"
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-48 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#4fa8ff]"
        />
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
          className="text-zinc-400 hover:text-white transition-colors active:scale-90"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});