import React, { useRef, useEffect, memo } from 'react';
import { X, ImageIcon, CheckCircle2 } from 'lucide-react';
import { DragHandlers } from './types';

const MiniProfileMockup = memo(function MiniProfileMockup() {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
      <div className="h-[35%] w-full bg-black/40 border-b border-white/5" />
      <div className="flex-1 bg-black/70 backdrop-blur-md p-2 pt-5 relative">
         <div className="absolute -top-3 left-2 w-7 h-7 rounded-full bg-[#1a2229] border-[1.5px] border-black" />
         <div className="w-12 h-1.5 bg-white/30 rounded-full mb-1.5" />
         <div className="w-8 h-1.5 bg-white/10 rounded-full mb-3" />
         <div className="w-full h-1 bg-white/5 rounded-full mb-1" />
         <div className="w-4/5 h-1 bg-white/5 rounded-full" />
      </div>
    </div>
  );
});

const MiniMatrixCanvas = memo(function MiniMatrixCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const fontSize = 8;
    const columns = canvas.width / fontSize;

    if (dropsRef.current.length !== Math.floor(columns)) {
      dropsRef.current = Array(Math.floor(columns)).fill(1);
    }
    const drops = dropsRef.current;
    const letters = '01'.split('');

    let rafId = 0;
    let lastDraw = 0;
    const FRAME_INTERVAL = 50; 

    const tick = (timestamp: number) => {
      rafId = requestAnimationFrame(tick);
      if (timestamp - lastDraw < FRAME_INTERVAL) return;
      lastDraw = timestamp;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.95) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70 mix-blend-screen" />;
});

export default memo(function CustomizeSheet({
  isOpen, drag, bannerUrl, isUploading, cropType, onBannerClick, onChooseBannerFile, bannerInputRef,
  onFileChange, profileEffect, onUpdateEffect, onClose,
}: {
  isOpen: boolean;
  drag: DragHandlers;
  bannerUrl: string;
  isUploading: boolean;
  cropType: 'avatar' | 'banner' | 'post';
  onBannerClick: () => void;
  onChooseBannerFile: () => void;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  profileEffect: string;
  onUpdateEffect: (effect: string) => void;
  onClose: () => void;
}) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col justify-end ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        ref={drag.backdropRef}
        className="absolute inset-0 bg-black/70"
        style={drag.backdropStyle}
        onClick={onClose}
      />
      <div
        ref={drag.sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[#0a0d10] rounded-t-[28px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-zinc-800/60"
        style={{ ...drag.sheetStyle, maxHeight: '92dvh', height: '92dvh' }}
      >
        <div
          className="flex-shrink-0 z-20 bg-[#0a0d10] rounded-t-[28px]"
          style={{ touchAction: 'none' }}
          onTouchStart={drag.handleTouchStart}
          onTouchMove={drag.handleTouchMove}
          onTouchEnd={drag.handleTouchEnd}
        >
          <div className="w-10 h-[5px] bg-zinc-700 rounded-full mx-auto mt-3 mb-1 cursor-grab active:cursor-grabbing" />
          <div className="flex justify-between items-center px-4 pb-3 pt-2 border-b border-zinc-800/60 bg-[#0a0d10]">
            <button onClick={onClose} className="text-white p-1.5 rounded-full hover:bg-zinc-800/60 active:scale-90 transition-all"><X className="w-5 h-5"/></button>
            <h2 className="font-bold text-base tracking-tight select-none pointer-events-none text-white">Customize Profile</h2>
            <button onClick={onClose} className="text-[#4fa8ff] font-semibold text-sm active:scale-95 transition-transform px-1">Done</button>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
        >
        <div className="flex flex-col items-center py-8 relative z-10 px-6 border-b border-zinc-800/50">
          <div
            className="w-full h-32 rounded-xl overflow-hidden mb-4 border-2 border-zinc-700/80 shadow-[0_0_25px_rgba(0,0,0,0.5)] relative group cursor-pointer active:scale-[0.98] transition-transform"
            onClick={onBannerClick}
          >
            <img src={bannerUrl} alt="Banner Preview" className={`w-full h-full object-cover transition-opacity duration-300 ${isUploading && cropType === 'banner' ? 'opacity-30' : 'group-hover:opacity-70'}`} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <ImageIcon className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            {isUploading && cropType === 'banner' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
             <button onClick={onBannerClick} className="px-5 py-2 rounded-full bg-zinc-800/50 text-[#4fa8ff] font-semibold text-sm hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-700/50 shadow-sm">
                Edit banner
             </button>
          </div>
          <input type="file" ref={bannerInputRef} accept="image/*" onChange={onFileChange} className="hidden" />
        </div>

        <div className="px-6 py-8">
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Profile Effects</h4>
          <div className="grid grid-cols-2 gap-4">
            
            <div
              onClick={() => onUpdateEffect('none')}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all active:scale-[0.98] ${profileEffect === 'none' ? 'border-[#4fa8ff] shadow-[0_0_15px_rgba(79,168,255,0.2)]' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
               <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-[#1a2229]"></div>
               <MiniProfileMockup />
               {profileEffect === 'none' && (
                 <div className="absolute top-2 right-2 bg-[#4fa8ff] rounded-full p-0.5 z-20 shadow-md">
                   <CheckCircle2 className="w-4 h-4 text-white" />
                 </div>
               )}
               <div className="absolute bottom-2 inset-x-0 flex justify-center z-20">
                 <span className="text-[10px] font-bold text-zinc-300 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-md">Default</span>
               </div>
            </div>

            <div
              onClick={() => onUpdateEffect('matrix')}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all active:scale-[0.98] bg-black ${profileEffect === 'matrix' ? 'border-[#4fa8ff] shadow-[0_0_15px_rgba(79,168,255,0.2)]' : 'border-zinc-800 hover:border-zinc-600'}`}
            >
               <MiniMatrixCanvas active={isOpen} />
               <MiniProfileMockup />
               {profileEffect === 'matrix' && (
                 <div className="absolute top-2 right-2 bg-[#4fa8ff] rounded-full p-0.5 z-20 shadow-md">
                   <CheckCircle2 className="w-4 h-4 text-white" />
                 </div>
               )}
               <div className="absolute bottom-2 inset-x-0 flex justify-center z-20">
                 <span className="text-[10px] font-bold text-green-400 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-md border border-green-500/20">Matrix</span>
               </div>
            </div>

          </div>
        </div>

        </div>
      </div>
    </div>
  );
});