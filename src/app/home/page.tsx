"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageSquare,
  Send,
  MoreHorizontal,
  CheckCircle2,
  Bell,
  Search
} from "lucide-react";

import CommentSheet from './CommentSheet';
import LikesSheet from './LikesSheet'; 
import NotificationsSheet from './NotificationsSheet';
import useSheetDrag from '../profile/useSheetDrag';
import { getGlobalFeed } from "../actions/feed";
import { toggleLike } from "../actions/engagement";
import { searchUsers } from "../actions/search";
import { useNotifications } from '@/hooks/useNotifications';
import { formatCount } from '../profile/helpers';

/* ============================================================
   LIKERS TEXT 
   ============================================================ */
const LikersText = ({ likers, onClick }: { likers: any[], onClick: () => void }) => {
  if (!likers || likers.length === 0) return null;

  const formattedLikers = likers.map(liker => {
    if (typeof liker === 'string') return { username: liker, avatar_url: null };
    return liker;
  });

  let text = "";
  if (formattedLikers.length === 1) text = `Liked by ${formattedLikers[0].username}`;
  else if (formattedLikers.length === 2) text = `Liked by ${formattedLikers[0].username} and ${formattedLikers[1].username}`;
  else text = `Liked by ${formattedLikers[0].username}, ${formattedLikers[1].username} and ${formattedLikers.length - 2} others`;

  return (
    <div 
      className="px-4 text-[12px] text-zinc-400 font-medium -mt-1 mb-2 flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition-colors"
      onClick={onClick}
    >
      <div className={`relative shrink-0 flex items-center justify-center ${formattedLikers.length === 1 ? 'w-5 h-5' : 'w-7 h-7'}`}>
        {formattedLikers.length === 1 ? (
          <img 
             src={formattedLikers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[0].username}&backgroundColor=ffffff`}
             className="w-5 h-5 rounded-full object-cover"
             alt="avatar"
          />
        ) : (
          <>
            <img 
               src={formattedLikers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[0].username}&backgroundColor=ffffff`}
               className="w-5 h-5 rounded-full object-cover absolute top-0 left-0 z-0"
               alt="avatar"
            />
            <img 
               src={formattedLikers[1].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[1].username}&backgroundColor=ffffff`}
               className="w-5 h-5 rounded-full object-cover absolute bottom-0 right-0 border-2 border-black z-10"
               alt="avatar"
            />
          </>
        )}
      </div>
      <span>{text}</span>
    </div>
  );
};

// 1. Robust Image Parser 
const parsePostImages = (post: any) => {
  const rawData = post?.image_urls || post?.image_url;
  if (!rawData) return [];
  
  let parsedArray = [];
  if (Array.isArray(rawData)) {
    parsedArray = rawData;
  } else if (typeof rawData === 'string') {
    try {
      const jsonParsed = JSON.parse(rawData);
      parsedArray = Array.isArray(jsonParsed) ? jsonParsed : [rawData];
    } catch (e) {
      if (rawData.startsWith('{') && rawData.endsWith('}')) {
        parsedArray = rawData.slice(1, -1).split(',');
      } else {
        parsedArray = [rawData];
      }
    }
  }

  return parsedArray
    .map((url: any) => typeof url === 'string' ? url.replace(/(^['"]+|['"]+$)/g, '').trim() : '')
    .filter((url: string) => url.length > 0);
};

// 2. Time Formatter
const timeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return "now";
};

const LikeButton = ({ postId, initialLiked, initialCount }: { postId: string, initialLiked: boolean, initialCount: number }) => {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  // Keep track of what the database actually knows
  const serverState = useRef(initialLiked);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout if the component unmounts while tapping
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Instantly flip the UI on EVERY tap (No locks, 0 latency)
    const newLikedState = !liked;
    setLiked(newLikedState);
    setCount(prev => newLikedState ? prev + 1 : prev - 1);

    // 2. Clear any pending server updates from previous rapid taps
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 3. Wait for you to stop tapping before syncing with the database
    timeoutRef.current = setTimeout(() => {
      // Only hit the database if your final UI state differs from the server
      if (newLikedState !== serverState.current) {
        toggleLike(postId)
          .then((res) => {
            if (res?.success) {
              serverState.current = newLikedState; // Update our known truth
            } else {
              // Revert UI if the server explicitly fails
              setLiked(serverState.current);
              setCount(prev => serverState.current ? prev + 1 : prev - 1);
            }
          })
          .catch(() => {
            // Revert UI on network failure
            setLiked(serverState.current);
            setCount(prev => serverState.current ? prev + 1 : prev - 1);
          });
      }
    }, 500); // Waits half a second after your last tap to fire
  };

  return (
    <div className="flex items-center gap-1.5 z-20 relative">
      <button onClick={handleLike} className="flex items-center justify-center p-1 group transition-all active:scale-90">
        <Heart
          className={`w-[26px] h-[26px] transition-colors ${
            liked
              ? "text-red-500 fill-red-500"
              : "text-zinc-100 group-hover:text-red-500"
          }`}
        />
      </button>
      {count > 0 && <span className="text-sm font-bold text-white mr-2">{count}</span>}
    </div>
  );
};

// 4. IG-Style Swipeable Carousel
const FeedImageCarousel = ({ images }: { images: string[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="w-full bg-zinc-950 mb-3 flex items-center justify-center">
        <img src={images[0]} alt="Post content" className="w-full h-auto max-h-[70vh] object-cover" />
      </div>
    );
  }

  const handleScroll = () => {
  if (scrollRef.current) {
    // Escape the render phase synchronously
    requestAnimationFrame(() => {
      // Ensure the ref still exists after the frame resolves
      if (!scrollRef.current) return; 
      
      const scrollPosition = scrollRef.current.scrollLeft;
      const width = scrollRef.current.clientWidth;
      const newIndex = Math.round(scrollPosition / width);
      setActiveIndex(newIndex);
    });
  }
};

  return (
    <div className="relative w-full bg-zinc-950 mb-3 group">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
      >
        {images.map((img, i) => (
          <div key={i} className="w-full flex-none snap-center flex items-center justify-center">
            <img src={img} alt={`Post ${i+1}`} className="w-full h-auto max-h-[70vh] object-cover" />
          </div>
        ))}
      </div>
      
      <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold backdrop-blur-md pointer-events-none">
        {activeIndex + 1} / {images.length}
      </div>

      <div className="absolute -bottom-4 inset-x-0 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-1.5 bg-zinc-300" : "w-1.5 bg-zinc-700"
            }`} 
          />
        ))}
      </div>
    </div>
  );
};

type SearchPhase = 'idle' | 'entering' | 'open' | 'exiting';

// 5. Main Page Component
export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Observer Ref (MUST BE DEFINED HERE, BUT USED AFTER QUERY)
  const observerRef = useRef<HTMLDivElement>(null);

  // Sheet States
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeLikesPostId, setActiveLikesPostId] = useState<string | null>(null); 
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);

  // Immersive Search Animation States
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('idle');
  const [searchInput, setSearchInput] = useState('');

  const searchMounted = searchPhase !== 'idle';
  const searchOpen    = searchPhase === 'open';

  // Notifications Hook
  const { notifications, unreadCount, markAsRead } = useNotifications(session?.user?.id);

  // Initialize Infinite Query FIRST (Before useEffects that depend on it)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["global_feed"],
    queryFn: ({ pageParam = 0 }) => getGlobalFeed(pageParam, 10),
    getNextPageParam: (lastPage) => lastPage?.nextPage,
    initialPageParam: 0,
  });

  // Flatten all page post arrays into a single continuous list
  const posts = data?.pages.flatMap((page) => page?.posts || []) || [];

  // Setup Intersection Observer AFTER query initialization
  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Prevent Background Scrolling When Any Overlay is Open
  useEffect(() => {
    if (
      searchMounted || 
      activeCommentPostId !== null || 
      activeLikesPostId !== null || 
      isNotifsOpen
    ) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [searchMounted, activeCommentPostId, activeLikesPostId, isNotifsOpen]);

  // 1. Hyper-fast 75ms debounce state for Search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 75); 
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 2. React Query handles the fetching, caching, and loading states automatically
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['search', debouncedSearch],
    queryFn: async () => {
      const res = await searchUsers(debouncedSearch);
      return res.success ? (res.users || []) : [];
    },
    // Only run the query if there is actually text to search
    enabled: debouncedSearch.trim().length > 0,
    // Cache the results for 10 minutes. Backspacing is now literally 0 latency.
    staleTime: 1000 * 60 * 10, 
  });

   const isSearching = isFetching || searchInput !== debouncedSearch;

  // Drags
  const commentDrag = useSheetDrag(!!activeCommentPostId, () => setActiveCommentPostId(null), { closeThreshold: 150, opacityDivisor: 500 });
  const likesDrag = useSheetDrag(!!activeLikesPostId, () => setActiveLikesPostId(null), { closeThreshold: 150, opacityDivisor: 500 }); 

  const liveRadarBeacons = [
    { id: 1, name: "Zaidh", urgent: true },
    { id: 2, name: "Thasreef", urgent: true },
    { id: 3, name: "Haseeb", urgent: false },
    { id: 4, name: "Zehna", urgent: false },
  ];

  // Satisfying Search Mount Logic
  const openSearch = () => {
    setSearchInput('');
    setSearchPhase('entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSearchPhase('open');
      });
    });
  };

  const closeSearch = () => {
    setSearchPhase('exiting');
    setTimeout(() => setSearchPhase('idle'), 400); 
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-white/20 pb-24">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes slideUpResult {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div className="max-w-xl mx-auto w-full flex flex-col relative z-10">
        
        {/* TOP BAR WITH PERFECT TOP-SEAL */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#121212]/90 backdrop-blur-2xl ... before:bg-transparent">
          <span className="font-extrabold text-[22px] tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-zinc-200 to-zinc-500">
            Nexus
          </span>
          <div className="flex gap-5 items-center">
            
            <div className="relative cursor-pointer group flex items-center justify-center" onClick={() => { setIsNotifsOpen(true); markAsRead(); }}>
              <Bell className="w-[22px] h-[22px] text-zinc-300 group-hover:text-white transition-colors" strokeWidth={2.2} />
              {unreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-black">
                  {unreadCount}
                </div>
              )}
            </div>
            
            <button onClick={openSearch} className="p-0 bg-transparent border-none flex items-center justify-center group outline-none active:scale-90 transition-transform">
              <Search className="w-[22px] h-[22px] text-zinc-300 group-hover:text-white transition-colors cursor-pointer" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* LIVE RADAR */}
        <div className="w-full border-b border-zinc-900/80 bg-black pt-4 pb-4">
          <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 snap-x">
            <div className="snap-start shrink-0 flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                <img 
                  src={session?.user?.image || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${session?.user?.name || 'User'}&backgroundColor=ffffff`}
                  alt="You"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-2xl text-white font-light">+</span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-400 truncate w-16 text-center">Drop</span>
            </div>

            {liveRadarBeacons.map((beacon) => (
              <div key={beacon.id} className="snap-start shrink-0 flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform">
                <div className={`w-17 h-17 rounded-full p-[2.5px] ${beacon.urgent ? 'bg-gradient-to-tr from-orange-500 to-pink-500' : 'bg-zinc-800'}`}>
                  <div className="w-16 h-16 rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                    <img 
                      src={`https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${beacon.name}&backgroundColor=ffffff`}
                      alt={beacon.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-white truncate w-16 text-center">{beacon.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN FEED */}
        <div className="flex flex-col bg-transparent">
          {posts.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-sm">No posts on the grid yet.</div>
          ) : (
            posts.map((post: any) => {
              const images = parsePostImages(post);
              
              return (
                <div key={post.id} className="w-full flex flex-col border-b border-zinc-900/80 pb-6 pt-4">
                  
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-4 mb-3">
                    <div 
                       className="flex items-center cursor-pointer"
                       onClick={() => router.push(`/u/${post.users?.username}`)}
                    >
                      <img 
                        src={post.users?.avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${post.users?.username}&backgroundColor=ffffff`}
                        alt={post.users?.username}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-800" 
                      />
                      <div className="ml-3 flex flex-col">
                        <div className="flex items-center gap-1">
                          <h4 className="font-bold text-sm text-white">{post.users?.full_name || 'Anonymous User'}</h4>
                          <CheckCircle2 className="w-3 h-3 text-zinc-400 fill-zinc-400/20" />
                        </div>
                        <span className="text-[11px] text-zinc-500 font-medium">@{post.users?.username}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-xs font-medium">{timeAgo(post.created_at)}</span>
                      <button className="text-zinc-500 hover:text-white transition-colors active:scale-90">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <FeedImageCarousel images={images} />

                  <div className="px-3 flex items-center gap-4 mb-2 mt-2">
                    <LikeButton postId={post.id} initialLiked={post.hasLiked} initialCount={post.likeCount} />
                    
                    <div className="flex items-center gap-1.5 z-20 relative">
                      <button 
                        onClick={() => setActiveCommentPostId(post.id)}
                        className="flex items-center justify-center p-1 group transition-all active:scale-95"
                      >
                        <MessageSquare className="w-[26px] h-[26px] text-zinc-100 group-hover:text-zinc-300 transition-colors" />
                      </button>
                      {post.commentCount > 0 && (
                        <span className="text-sm font-bold text-white mr-2">
                          {formatCount(post.commentCount)}
                        </span>
                      )}
                    </div>
                    
                    <button className="hover:bg-zinc-800 transition-colors active:scale-95 ml-auto p-1 rounded-full">
                      <Send className="w-[26px] h-[26px] text-zinc-100 hover:text-zinc-300" />
                    </button>
                  </div>

                  <LikersText likers={post.likers || []} onClick={() => setActiveLikesPostId(post.id)} />

                  <div className="px-4">
                    {post.content && (
                      <p className="text-[14px] text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                        {post.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          
          {/* SCROLL SENTINEL */}
          <div ref={observerRef} className="py-8 flex justify-center items-center w-full">
            {isFetchingNextPage && (
              <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
        
        <NotificationsSheet 
          isOpen={isNotifsOpen} 
          onClose={() => setIsNotifsOpen(false)} 
          notifications={notifications} 
          currentUsername={session?.user?.name} 
        />

        <CommentSheet 
          isOpen={!!activeCommentPostId}
          drag={commentDrag}
          onClose={() => setActiveCommentPostId(null)}
          postId={activeCommentPostId}
          currentUserAvatar={session?.user?.image || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${session?.user?.name || 'User'}&backgroundColor=ffffff`}
        />

        <LikesSheet 
          isOpen={!!activeLikesPostId}
          drag={likesDrag}
          onClose={() => setActiveLikesPostId(null)}
          postId={activeLikesPostId}
        />

        {/* ============================================================
            SPRING-ANIMATED LUXURY SEARCH OVERLAY
            ============================================================ */}
        {searchMounted && (
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-3xl overflow-hidden touch-none overscroll-none"
            style={{
              opacity: searchOpen ? 1 : 0,
              pointerEvents: searchOpen ? 'auto' : 'none',
              transition: 'opacity 500ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {/* The Bouncy Search Pill Container */}
            <div
              className="flex items-center gap-3 px-4 pt-12 pb-3 w-full max-w-xl mx-auto origin-top"
              style={{
                transform: searchOpen 
                  ? 'translateY(0) scale(1) rotateX(0deg)' 
                  : 'translateY(-30px) scale(0.95) rotateX(-15deg)',
                opacity: searchOpen ? 1 : 0,
                perspective: '1000px',
                transition: 'transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-out',
              }}
            >
              {/* Input Wrapper - Slimmed down for mobile */}
              <div 
                className="flex-1 flex items-center gap-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 rounded-xl px-4 py-2 border border-white/10 focus-within:border-white/30 focus-within:bg-zinc-900 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-all duration-300 group overflow-hidden"
                style={{
                  transform: searchOpen ? 'scaleX(1)' : 'scaleX(0.93)',
                  transition: 'transform 800ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms',
                }}
              >
                <Search className="w-[18px] h-[18px] text-zinc-500 group-focus-within:text-white transition-colors shrink-0" strokeWidth={2.5} />
                <input
  type="search"
  value={searchInput}
  onChange={e => setSearchInput(e.target.value)}
  placeholder="Search Nexus..."
  className="bg-transparent border-none outline-none text-[15px] text-white placeholder:text-zinc-500 w-full font-medium tracking-tight h-6 leading-6 [&::-webkit-search-cancel-button]:appearance-none"
  autoFocus
  autoComplete="off"
  autoCorrect="off"
  spellCheck="false"
/>
              </div>

              {/* Staggered Cancel Button */}
              <button
                onClick={closeSearch}
                className="text-zinc-400 hover:text-white text-[15px] font-medium px-1 py-1 outline-none active:scale-95 transition-colors shrink-0"
                style={{
                  transform: searchOpen ? 'translateX(0)' : 'translateX(20px)',
                  opacity: searchOpen ? 1 : 0,
                  transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 150ms, opacity 400ms ease-out 150ms',
                }}
              >
                Cancel
              </button>
            </div>

            {/* Dynamic Search Results / Empty State */}
            <div className="flex-1 flex flex-col w-full pb-40 overflow-y-auto hide-scrollbar px-5 mt-4">
              {searchInput.trim().length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full mt-20"
                  style={{
                    transform: searchOpen ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.9)',
                    opacity: searchOpen ? 1 : 0,
                    transition: 'transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms, opacity 500ms ease-out 200ms',
                  }}
                >
                  <div className="w-14 h-14 rounded-full bg-zinc-900/50 flex items-center justify-center mb-4 border border-white/5">
                    <Search className="w-6 h-6 text-zinc-600 stroke-[1.5]" />
                  </div>
                  <p className="text-zinc-400 text-[14px] font-medium tracking-tight">
                    Find users and squads
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {isSearching && searchResults.length === 0 ? (
                     <div className="text-center text-zinc-500 mt-10 text-sm">Searching...</div>
                  ) : searchResults.length === 0 ? (
                     <div className="text-center text-zinc-500 mt-10 text-sm">No users found.</div>
                  ) : (
                    searchResults.map((user, i) => (
  <div 
    key={user.id}
    onClick={() => {
      closeSearch();
      router.push(`/u/${user.username}`);
    }}
    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-900/60 transition-colors cursor-pointer active:scale-[0.98]"
    style={{
      animation: `slideUpResult 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${i * 40}ms forwards`,
      opacity: 0 
    }}
  >
    <img 
      src={user.avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${user.username}&backgroundColor=ffffff`} 
      alt={user.username} 
      className="w-12 h-12 rounded-full border border-zinc-800 object-cover shrink-0" 
    />
    <div className="flex flex-col">
      <span className="font-bold text-[15px] text-white tracking-tight">{user.full_name}</span>
      <span className="text-[13px] text-zinc-500 font-medium">@{user.username}</span>
    </div>
  </div>
))
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}