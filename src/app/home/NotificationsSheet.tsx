import React, { memo, useState, useEffect } from 'react';
import { X, Heart, MessageSquare, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { timeAgo } from '../profile/helpers';
import { acceptLinkRequest, rejectLinkRequest } from '../actions/links';

const getPostThumbnail = (rawData: any) => {
  if (!rawData) return null;
  try {
    const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    const urlArray = Array.isArray(parsed) ? parsed : [parsed];
    return urlArray.length > 0 && typeof urlArray[0] === 'string' 
       ? urlArray[0].replace(/(^['"]+|['"]+$)/g, '').trim() 
       : null;
  } catch (e) {
    if (typeof rawData === 'string' && rawData.startsWith('{') && rawData.endsWith('}')) {
      return rawData.slice(1, -1).split(',')[0].replace(/(^['"]+|['"]+$)/g, '').trim();
    }
    return typeof rawData === 'string' ? rawData : null;
  }
};

const NotificationItem = ({ notif, currentUsername, onRoute, animateIn, index, onClose }: any) => {
  const router = useRouter();
  const [resolvedState, setResolvedState] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  const getNotificationData = (notif: any) => {
    if (notif.type === 'link_request') {
      return {
        displayUsers: notif.sender ? [notif.sender] : [],
        text: `requested to link up.`,
        thumbnail: null,
        isActionable: true,
        requesterId: notif.sender_id
      };
    }
    if (notif.type === 'link_accepted') {
      return {
        displayUsers: notif.sender ? [notif.sender] : [],
        text: `accepted your link request.`,
        thumbnail: null,
        isActionable: false,
        requesterId: null
      };
    }

    const action = notif.type === 'like' ? 'liked' : 'commented on';
    const list = notif.type === 'like' ? notif.post?.post_likes : notif.post?.post_comments;
    let displayUsers: any[] = [];
    if (list && list.length > 0) {
      const seen = new Set();
      for (const item of list) {
        const u = item.users;
        if (u && u.username && u.username !== currentUsername && !seen.has(u.username)) {
          seen.add(u.username);
          displayUsers.push(u);
        }
      }
    }
    let text = `Someone ${action} your post.`;
    if (displayUsers.length === 1) text = `${displayUsers[0].username} ${action} your post.`;
    else if (displayUsers.length === 2) text = `${displayUsers[0].username} and ${displayUsers[1].username} ${action} your post.`;
    else if (displayUsers.length > 2) text = `${displayUsers[0].username}, ${displayUsers[1].username} and ${displayUsers.length - 2} others ${action} your post.`;
    
    return { displayUsers, text, thumbnail: getPostThumbnail(notif.post?.image_url), isActionable: false, requesterId: null };
  };

  const { displayUsers, text, thumbnail, isActionable, requesterId } = getNotificationData(notif);

  const handleCardClick = () => {
    if (notif.post_id) {
      onRoute(notif.post_id, notif.type);
    } else if (displayUsers[0]?.username) {
      onClose();
      router.push(`/u/${displayUsers[0].username}`);
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setResolvedState('accepted');
    await acceptLinkRequest(requesterId);
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setResolvedState('rejected');
    await rejectLinkRequest(requesterId);
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/5 transition-all group cursor-pointer active:scale-[0.98]"
      style={{
        transform: animateIn ? 'translateY(0)' : 'translateY(20px)',
        opacity: animateIn ? 1 : 0,
        transition: animateIn 
          ? `transform 500ms cubic-bezier(0.16, 1, 0.3, 1) ${index * 35}ms, opacity 400ms ease ${index * 35}ms` 
          : 'transform 200ms ease, opacity 200ms ease',
      }}
    >
      <div className="relative shrink-0 w-11 h-11 flex items-center justify-center">
        {displayUsers.length === 0 ? (
          <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5">
            {notif.type === 'like' ? <Heart className="w-4 h-4 text-red-500 fill-red-500" /> : <MessageSquare className="w-4 h-4 text-blue-400 fill-blue-400" />}
          </div>
        ) : displayUsers.length === 1 ? (
          <img src={displayUsers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${displayUsers[0].username}&backgroundColor=ffffff`} className="w-11 h-11 rounded-full object-cover border border-white/10" alt={displayUsers[0].username} />
        ) : (
          <>
            <img src={displayUsers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${displayUsers[0].username}&backgroundColor=ffffff`} className="w-8 h-8 rounded-full object-cover absolute top-0 left-0 border border-white/10" alt={displayUsers[0].username} />
            <img src={displayUsers[1].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${displayUsers[1].username}&backgroundColor=ffffff`} className="w-8 h-8 rounded-full object-cover absolute bottom-0 right-0 border-2 border-[#0a0d10]" alt={displayUsers[1].username} />
          </>
        )}
      </div>
      <div className="flex flex-col flex-1">
        <p className="text-[14px] text-zinc-200 font-medium leading-snug group-hover:text-white transition-colors">{text}</p>
        <span className="text-[12px] text-zinc-500 mt-0.5">{timeAgo(notif.updated_at)}</span>
        
        {isActionable && resolvedState === 'pending' && (
          <div className="flex gap-2 mt-2.5">
            <button onClick={handleAccept} className="bg-[#4fa8ff] text-black px-4 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform hover:bg-[#3d93e6]">Accept</button>
            <button onClick={handleReject} className="bg-zinc-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform hover:bg-zinc-700 border border-zinc-700">Reject</button>
          </div>
        )}
        {isActionable && resolvedState === 'accepted' && <span className="text-xs text-[#4fa8ff] font-medium mt-2">Request accepted</span>}
        {isActionable && resolvedState === 'rejected' && <span className="text-xs text-zinc-500 font-medium mt-2">Request rejected</span>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {!notif.is_read && <div className="w-2 h-2 bg-[#4fa8ff] rounded-full shadow-[0_0_12px_rgba(79,168,255,0.6)]" />}
        {thumbnail && <img src={thumbnail} alt="Preview" className="w-11 h-11 rounded-xl object-cover border border-white/10 shadow-sm" />}
      </div>
    </div>
  );
};

export default memo(function NotificationsOverlay({
  isOpen, onClose, notifications, currentUsername 
}: {
  isOpen: boolean; onClose: () => void; notifications: any[]; currentUsername?: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = '';
      }, 250); 
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (mounted && isOpen) {
      requestAnimationFrame(() => { requestAnimationFrame(() => { setAnimateIn(true); }); });
    }
  }, [mounted, isOpen]);

  if (!mounted) return null;

  const handleRoute = (postId: string, type: string) => {
    onClose();
    router.push(`/profile?postId=${postId}&open=${type}s`);
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-2xl overflow-hidden touch-none overscroll-none"
      style={{ opacity: animateIn ? 1 : 0, pointerEvents: animateIn ? 'auto' : 'none', transition: 'opacity 300ms ease' }}
    >
      <div 
        className="flex flex-col w-full h-full max-w-xl mx-auto"
        style={{
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)',
          opacity: animateIn ? 1 : 0,
          transition: animateIn 
            ? 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease' 
            : 'transform 250ms cubic-bezier(0.3, 0, 0.8, 0.15), opacity 250ms ease',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-12 pb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-extrabold text-[22px] tracking-tight text-white">Activity</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-5 pb-24 w-full hide-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
               <Bell className="w-12 h-12 mb-4 text-zinc-800 stroke-[1.5]" />
               <span className="text-[15px] font-medium tracking-tight text-zinc-400">All caught up.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((notif: any, index: number) => (
                <NotificationItem 
                  key={notif.id} 
                  notif={notif} 
                  currentUsername={currentUsername} 
                  onRoute={handleRoute} 
                  animateIn={animateIn} 
                  index={index} 
                  onClose={onClose} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});