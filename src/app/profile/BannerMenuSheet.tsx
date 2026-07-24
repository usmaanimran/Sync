import React, { memo } from 'react';
import { ImageIcon, Trash2 } from 'lucide-react';
import { DragHandlers } from './types';

export default memo(function BannerMenuSheet({
  isOpen, drag, onClose, onChooseFile, onRemove,
}: {
  isOpen: boolean;
  drag: DragHandlers;
  onClose: () => void;
  onChooseFile: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`fixed inset-0 z-[70] flex flex-col justify-end overflow-hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        ref={drag.backdropRef}
        className="absolute inset-0 bg-black/60"
        style={drag.backdropStyle}
        onClick={onClose}
      />
      <div
        ref={drag.sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[#1a2229] rounded-t-[32px] flex flex-col pb-10 shadow-2xl border-t border-zinc-700/50"
        style={drag.sheetStyle}
      >
        <div
          className="w-full pt-3 px-6 pb-4 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onTouchStart={drag.handleTouchStart}
          onTouchMove={drag.handleTouchMove}
          onTouchEnd={drag.handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-zinc-600 rounded-full mx-auto mb-4" />
          <h3 className="text-center font-bold text-lg text-white tracking-tight pointer-events-none">Profile Banner</h3>
        </div>
        <div className="px-6">
          <button onClick={onChooseFile} className="flex items-center gap-4 w-full py-4 text-white font-semibold text-left border-b border-zinc-700/50 hover:bg-zinc-800/30 active:scale-95 transition-all rounded-xl px-4">
            <div className="p-2 bg-blue-500/10 rounded-full"><ImageIcon className="w-5 h-5 text-blue-400" /></div>
            Choose from Gallery
          </button>
          <button onClick={onRemove} className="flex items-center gap-4 w-full py-4 text-red-400 font-semibold text-left hover:bg-red-500/10 active:scale-95 transition-all rounded-xl px-4 mt-2">
            <div className="p-2 bg-red-500/10 rounded-full"><Trash2 className="w-5 h-5 text-red-400" /></div>
            Remove Current Banner
          </button>
        </div>
      </div>
    </div>
  );
});