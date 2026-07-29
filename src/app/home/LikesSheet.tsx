import React, { memo, useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getPostLikes } from '../actions/engagement';

export default memo(function LikesSheet({
  isOpen, drag, onClose, postId
}: {
  isOpen: boolean; drag: any; onClose: () => void; postId: string | null;
}) {
  const [likers, setLikers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      getPostLikes(postId).then((res) => {
        if (res.success) setLikers(res.likers || []);
        setLoading(false);
      });
    }
  }, [isOpen, postId]);

  return (
    <div className={`fixed inset-0 z-[150] flex flex-col justify-end overflow-hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        ref={drag.backdropRef}
        className="absolute inset-0 bg-black/70"
        style={drag.backdropStyle}
        onClick={onClose}
      />
      <div 
         ref={drag.sheetRef}
         className="absolute bottom-0 left-0 right-0 bg-[#0a0d10] rounded-t-[28px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-zinc-800/60"
         style={{ ...drag.sheetStyle, maxHeight: '60dvh', height: '60dvh' }}
      >
        <div className="flex-shrink-0 z-20 bg-[#0a0d10] rounded-t-[28px]" style={{ touchAction: 'none' }} onTouchStart={drag.handleTouchStart} onTouchMove={drag.handleTouchMove} onTouchEnd={drag.handleTouchEnd}>
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-2 cursor-grab active:cursor-grabbing" />
          <div className="flex justify-between items-center px-4 pb-3 border-b border-zinc-800/60">
            <div className="w-8" />
            <h2 className="font-bold text-base tracking-tight text-white">Likes</h2>
            <button onClick={onClose} className="text-white p-1.5 rounded-full hover:bg-zinc-800/60 active:scale-90 transition-all"><X className="w-5 h-5"/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 hide-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : likers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p className="text-sm font-medium">No likes yet.</p>
            </div>
          ) : (
            likers.map((user: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={user.avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${user.username}&backgroundColor=ffffff`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full border border-zinc-800 object-cover shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">{user.full_name}</span>
                    <span className="text-[12px] font-medium text-zinc-500">@{user.username}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});