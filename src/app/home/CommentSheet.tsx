import React, { memo, useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Heart } from 'lucide-react';
import { getComments, addComment, toggleCommentLike } from '../actions/engagement';
import { timeAgo } from '../profile/helpers';

// Mini component to handle Optimistic UI for individual comment likes
const CommentLikeButton = ({ commentId, initialLiked, initialCount }: { commentId: string, initialLiked: boolean, initialCount: number }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const serverState = useRef(initialLiked);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLikedState = !liked;
    setLiked(newLikedState);
    setCount(prev => newLikedState ? prev + 1 : prev - 1);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (newLikedState !== serverState.current) {
        toggleCommentLike(commentId).then((res) => {
          if (res?.success) serverState.current = newLikedState;
          else { setLiked(serverState.current); setCount(prev => serverState.current ? prev + 1 : prev - 1); }
        }).catch(() => { setLiked(serverState.current); setCount(prev => serverState.current ? prev + 1 : prev - 1); });
      }
    }, 500);
  };

  return (
    <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
      <button onClick={handleLike} className="active:scale-75 transition-transform p-1">
        <Heart className={`w-[14px] h-[14px] transition-colors ${liked ? "text-red-500 fill-red-500" : "text-zinc-500 hover:text-zinc-300"}`} />
      </button>
      {count > 0 && <span className="text-[10px] text-zinc-500 font-medium">{count}</span>}
    </div>
  );
};

export default memo(function CommentSheet({
  isOpen, drag, onClose, postId, currentUserAvatar
}: {
  isOpen: boolean; drag: any; onClose: () => void; postId: string | null; currentUserAvatar: string;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      setReplyingTo(null);
      getComments(postId).then((res) => {
        if (res.success) setComments(res.comments || []);
        setLoading(false);
      });
    }
  }, [isOpen, postId]);

  const handleSend = () => {
    let commentText = newComment.trim();
    if (!commentText || !postId) return;

    // Optional: Prepend @username to the text if replying, like Instagram does
    if (replyingTo && !commentText.startsWith(`@${replyingTo.username}`)) {
        commentText = `@${replyingTo.username} ${commentText}`;
    }

    setNewComment("");
    const targetParentId = replyingTo ? replyingTo.id : null;
    setReplyingTo(null); 

    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      content: commentText,
      created_at: new Date().toISOString(),
      parent_id: targetParentId,
      likeCount: 0,
      hasLiked: false,
      users: { username: "You", avatar_url: currentUserAvatar }
    };

    setComments((prev) => [...prev, optimisticComment]);

    addComment(postId, commentText, targetParentId)
      .then((res) => {
        if (res.success && res.comment) {
          setComments((prev) => prev.map((c) => (c.id === tempId ? res.comment : c)));
        } else {
          setComments((prev) => prev.filter((c) => c.id !== tempId));
          setNewComment(commentText.replace(`@${replyingTo?.username} `, '')); 
        }
      })
      .catch(() => {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setNewComment(commentText.replace(`@${replyingTo?.username} `, ''));
      });
  };

  const handleReplyClick = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    if (inputRef.current) inputRef.current.focus();
  };

  // Group and sort comments (Parents first, then their children underneath)
  const parentComments = comments.filter(c => !c.parent_id).sort((a, b) => b.likeCount - a.likeCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  return (
    <div className={`fixed inset-0 z-[150] flex flex-col justify-end overflow-hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div ref={drag.backdropRef} className="absolute inset-0 bg-black/70" style={drag.backdropStyle} onClick={onClose} />
      
      <div ref={drag.sheetRef} className="absolute bottom-0 left-0 right-0 bg-[#0a0d10] rounded-t-[28px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-zinc-800/60" style={{ ...drag.sheetStyle, maxHeight: '85dvh', height: '85dvh' }}>
        
        <div className="flex-shrink-0 z-20 bg-[#0a0d10] rounded-t-[28px]" style={{ touchAction: 'none' }} onTouchStart={drag.handleTouchStart} onTouchMove={drag.handleTouchMove} onTouchEnd={drag.handleTouchEnd}>
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-2 cursor-grab active:cursor-grabbing" />
          <div className="flex justify-between items-center px-4 pb-3 border-b border-zinc-800/60">
            <div className="w-8" />
            <h2 className="font-bold text-base tracking-tight text-white">Comments</h2>
            <button onClick={onClose} className="text-white p-1.5 rounded-full hover:bg-zinc-800/60 active:scale-90 transition-all"><X className="w-5 h-5"/></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 hide-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500"><p className="text-sm font-medium">No comments yet.</p></div>
          ) : (
            parentComments.map((parent) => (
              <div key={parent.id} className="flex flex-col gap-4">
                {/* Parent Comment */}
                <div className={`flex gap-3 transition-opacity ${parent.id.toString().startsWith('temp-') ? 'opacity-70' : 'opacity-100'}`}>
                  <img src={parent.users?.avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${parent.users?.username}&backgroundColor=ffffff`} alt="avatar" className="w-8 h-8 rounded-full border border-zinc-800 object-cover shrink-0" />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-[13px] text-white">{parent.users?.username}</span>
                      <span className="text-[10px] font-medium text-zinc-500">{timeAgo(parent.created_at)}</span>
                    </div>
                    <p className="text-[13px] text-slate-200 mt-0.5 whitespace-pre-wrap">{parent.content}</p>
                    <button onClick={() => handleReplyClick(parent.id, parent.users?.username)} className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 w-fit mt-1.5 active:scale-95 transition-all">Reply</button>
                  </div>
                  <CommentLikeButton commentId={parent.id} initialLiked={parent.hasLiked} initialCount={parent.likeCount} />
                </div>

                {/* Child Comments (Replies) */}
                {comments.filter(c => c.parent_id === parent.id).map(child => (
                   <div key={child.id} className={`flex gap-3 ml-11 transition-opacity ${child.id.toString().startsWith('temp-') ? 'opacity-70' : 'opacity-100'}`}>
                    <img src={child.users?.avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${child.users?.username}&backgroundColor=ffffff`} alt="avatar" className="w-6 h-6 rounded-full border border-zinc-800 object-cover shrink-0" />
                    <div className="flex flex-col flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-[12px] text-white">{child.users?.username}</span>
                        <span className="text-[10px] font-medium text-zinc-500">{timeAgo(child.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-slate-200 mt-0.5 whitespace-pre-wrap">
                        {/* Highlights the @mention in blue like Instagram */}
                        {child.content.split(' ').map((word: string, i: number) => 
                           word.startsWith('@') ? <span key={i} className="text-blue-400 font-medium">{word} </span> : `${word} `
                        )}
                      </p>
                      {/* Replying to a reply just tags the person but keeps it in the same parent thread (1-level deep) */}
                      <button onClick={() => handleReplyClick(parent.id, child.users?.username)} className="text-[11px] font-bold text-zinc-500 hover:text-zinc-300 w-fit mt-1.5 active:scale-95 transition-all">Reply</button>
                    </div>
                    <CommentLikeButton commentId={child.id} initialLiked={child.hasLiked} initialCount={child.likeCount} />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t border-zinc-800/60 bg-[#0a0d10] mb-safe flex flex-col">
          {/* Replying To Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-zinc-900/50 px-4 py-2 border-b border-zinc-800/60">
              <span className="text-xs text-zinc-400">Replying to <span className="font-bold text-white">@{replyingTo.username}</span></span>
              <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-zinc-800 transition-colors"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
            </div>
          )}
          <div className="p-4 flex items-center gap-3 bg-zinc-900 m-3 rounded-full border border-zinc-800 pl-1 pr-2 py-1">
            <img src={currentUserAvatar} alt="You" className="w-8 h-8 rounded-full object-cover shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              className="flex-1 bg-transparent text-[13px] text-white placeholder-zinc-500 outline-none px-2"
            />
            <button onClick={handleSend} disabled={!newComment.trim()} className={`p-1.5 rounded-full transition-all ${newComment.trim() ? 'bg-[#4fa8ff] text-black active:scale-95' : 'text-zinc-600'}`}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});