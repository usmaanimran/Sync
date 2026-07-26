import React, { memo } from 'react'; 
import { X, ImageIcon, Plus } from 'lucide-react'; 

export default memo(function CreatePostSheet({
  isOpen, drag, onClose, content, onContentChange, onChooseImage, 
  postImageUrls, onRemoveImage, onPost, isUploading, isPosting 
}: {
  isOpen: boolean; drag: any; onClose: () => void;
  content: string; onContentChange: (val: string) => void;
  onChooseImage: () => void; 
  postImageUrls: string[]; // Array of initialized local blob URLs for pending upload items
  onRemoveImage: (index: number) => void; // Handler for removing specific drafts by index position
  onPost: () => void;
  isUploading: boolean; isPosting: boolean;
}) {
  const isPostDisabled = (!content.trim() && postImageUrls.length === 0) || isPosting || isUploading;
  
  return (
    <div className={`fixed inset-0 z-[150] flex flex-col justify-end overflow-hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        ref={drag.backdropRef}
        className="absolute inset-0 bg-black/70"
        style={drag.backdropStyle}
        onClick={onClose}
      />
      <div ref={drag.sheetRef} className="absolute bottom-0 left-0 right-0 bg-[#0a0d10] rounded-t-[28px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-zinc-800/60" style={{ ...drag.sheetStyle, maxHeight: '90dvh', height: '90dvh' }}>
        <div className="flex-shrink-0 z-20 bg-[#0a0d10] rounded-t-[28px]" style={{ touchAction: 'none' }} onTouchStart={drag.handleTouchStart} onTouchMove={drag.handleTouchMove} onTouchEnd={drag.handleTouchEnd}>
          <div className="w-10 h-[5px] bg-zinc-700 rounded-full mx-auto mt-3 mb-1 cursor-grab active:cursor-grabbing" />
          <div className="flex justify-between items-center px-4 pb-3 pt-2 border-b border-zinc-800/60 bg-[#0a0d10]">
            <button onClick={onClose} className="text-white p-1.5 rounded-full hover:bg-zinc-800/60 active:scale-90 transition-all"><X className="w-5 h-5"/></button>
            <h2 className="font-bold text-base tracking-tight text-white">New Drop</h2>
            <button onClick={onPost} disabled={isPostDisabled} className={`font-semibold text-sm px-3 py-1.5 rounded-full transition-all ${isPostDisabled ? 'bg-zinc-800 text-zinc-500' : 'bg-[#4fa8ff] text-black active:scale-95'}`}>
              {isPosting ? 'Sending...' : 'Post'}
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <textarea 
             value={content} 
             onChange={(e) => onContentChange(e.target.value)} 
             placeholder="What's going on?" 
             className="w-full bg-transparent text-white outline-none resize-none text-lg placeholder-zinc-500 min-h-[120px]"
          />
          
          {postImageUrls.length > 0 ? (
            <>
              {/* Horizontal scroll container for draft image previews */}
              <div className="flex gap-3 overflow-x-auto snap-x hide-scrollbar pb-2">
                {postImageUrls.map((url, idx) => (
                  <div key={idx} className="relative w-[85%] flex-none snap-center rounded-2xl overflow-hidden border border-zinc-800">
                    <img src={url} alt={`Preview ${idx}`} className="w-full h-auto object-cover" />
                    <button onClick={() => onRemoveImage(idx)} className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500/80 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Appended selection button for additional media */}
              <button onClick={onChooseImage} className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-[#4fa8ff] hover:text-[#4fa8ff] hover:bg-[#4fa8ff]/5 transition-all active:scale-[0.98]">
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" /> 
                    <span className="text-sm font-semibold">Add another image</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button onClick={onChooseImage} className="flex items-center justify-center gap-2 w-full py-10 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:border-[#4fa8ff] hover:text-[#4fa8ff] hover:bg-[#4fa8ff]/5 transition-all active:scale-[0.98]">
              {isUploading ? (
                <div className="w-6 h-6 border-2 border-[#4fa8ff] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6" /> 
                  <span className="font-semibold">Attach Media</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});