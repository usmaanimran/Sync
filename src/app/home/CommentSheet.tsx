import React, { memo, useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { getComments, addComment } from '../actions/engagement';

// Note: Ensure timeAgo is exported from your helpers, or paste it here.
import { timeAgo } from '../profile/helpers'; 

export default memo(function CommentSheet({
  isOpen, drag, onClose, postId, currentUserAvatar
}: {
  isOpen: boolean; drag: any; onClose: () => void; postId: string | null; currentUserAvatar: string;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments whenever the sheet opens for a specific post
  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      getComments(postId).then((res) => {
        if (res.success) setComments(res.comments || []);
        setLoading(false);
      });
    }
   }, [isOpen, postId]);

  const handleSend = async () => {
    if (!newComment.trim() || !postId || isSubmitting) return;
    setIsSubmitting(true);

    const res = await addComment(postId, newComment);
    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment]);
      setNewComment("");
    }
    
    setIsSubmitting(false);
  };

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
        style={{ ...drag.sheetStyle, maxHeight: '85dvh', height: '85dvh' }}
      >
        {/* Handle Bar */}
        <div className="flex-shrink-0 z-20 bg-[#0a0d10] rounded-t-[28px]" style={{ touchAction: 'none' }} onTouchStart={drag.handleTouchStart} onTouchMove={drag.handleTouchMove} onTouchEnd={drag.handleTouchEnd}>
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-2 cursor-grab active:cursor-grabbing" />
          <div className="flex justify-between items-center px-4 pb-3 border-b border-zinc-800/60">
            <div className="w-8" /> {/* Spacer */}
            <h2 className="font-bold text-base tracking-tight text-white">Comments</h2>
            <button onClick={onClose} className="text-white p-1.5 rounded-full hover:bg-zinc-800/60 active:scale-90 transition-all"><X className="w-5 h-5"/></button>
          </div>
        </div>
        
        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 hide-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p className="text-sm font-medium">No comments yet.</p>
              <p className="text-xs">Start the conversation.</p>
            </div>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <img 
                  src={comment.users?.avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${comment.users?.username}&backgroundColor=ffffff`} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-full border border-zinc-800 object-cover shrink-0" 
                />
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-sm text-white">{comment.users?.username}</span>
                    <span className="text-[10px] font-medium text-zinc-500">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-slate-200 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-zinc-800/60 p-4 bg-[#0a0d10] mb-safe">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-1 py-1 pr-2">
            <img src={currentUserAvatar} alt="You" className="w-8 h-8 rounded-full object-cover shrink-0 ml-1" />
            <input 
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none px-2"
            />
            <button 
              onClick={handleSend}
              disabled={!newComment.trim() || isSubmitting}
              className={`p-1.5 rounded-full transition-all ${newComment.trim() ? 'bg-[#4fa8ff] text-black active:scale-95' : 'text-zinc-600'}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});