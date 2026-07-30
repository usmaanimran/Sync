"use client";

import React, { useState, useRef, useEffect, useCallback, memo, Suspense } from 'react';
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getUserProfileByUsername } from "../../actions/profile";
import { getUserPosts } from "../../actions/post";
import ProfileEffect from '../../profile/ProfileEffect';
import PeekPostModal from '../../profile/PeekPostModal';
import CommentSheet from '../../home/CommentSheet';
import LikesSheet from '../../home/LikesSheet';
import useSheetDrag from '../../profile/useSheetDrag';
import { timeAgo, RANK_TIERS, generateDefaultAvatar, generateDefaultBanner, formatCount } from '../../profile/helpers';
import { toggleLike } from "../../actions/engagement";
import { 
  ChevronLeft, CheckCircle2, Link as LinkIcon, Crown, 
  Grid, FolderGit2, Heart, MessageSquare, Send, MoreHorizontal, UserPlus, MessageCircle 
} from 'lucide-react';

/* ============================================================
   LIKERS TEXT (Overlapping UI)
   ============================================================ */
const LikersText = ({ likers, onClick }: { likers: any[], onClick: () => void }) => {
  if (!likers || likers.length === 0) return null;
  const formattedLikers = likers.map(liker => typeof liker === 'string' ? { username: liker, avatar_url: null } : liker);

  let text = "";
  if (formattedLikers.length === 1) text = `Liked by ${formattedLikers[0].username}`;
  else if (formattedLikers.length === 2) text = `Liked by ${formattedLikers[0].username} and ${formattedLikers[1].username}`;
  else text = `Liked by ${formattedLikers[0].username}, ${formattedLikers[1].username} and ${formattedLikers.length - 2} others`;

  return (
    <div className="px-4 text-[12px] text-zinc-400 font-medium -mt-1 mb-2 flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition-colors" onClick={onClick}>
      <div className={`relative shrink-0 flex items-center justify-center ${formattedLikers.length === 1 ? 'w-5 h-5' : 'w-7 h-7'}`}>
        {formattedLikers.length === 1 ? (
          <img src={formattedLikers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[0].username}&backgroundColor=ffffff`} className="w-5 h-5 rounded-full object-cover" alt="avatar" />
        ) : (
          <>
            <img src={formattedLikers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[0].username}&backgroundColor=ffffff`} className="w-5 h-5 rounded-full object-cover absolute top-0 left-0 z-0" alt="avatar" />
            <img src={formattedLikers[1].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[1].username}&backgroundColor=ffffff`} className="w-5 h-5 rounded-full object-cover absolute bottom-0 right-0 border-2 border-black z-10" alt="avatar" />
          </>
        )}
      </div>
      <span>{text}</span>
    </div>
  );
};

/* ============================================================
   POST IMAGES PARSER HELPER
   ============================================================ */
const parsePostImages = (post: any) => {
  const rawData = post.image_urls || post.image_url;
  if (!rawData) return [];
  let parsedArray: any[] = [];
  if (Array.isArray(rawData)) {
    parsedArray = rawData;
  } else if (typeof rawData === 'string') {
    try {
      const jsonParsed = JSON.parse(rawData);
      if (Array.isArray(jsonParsed)) {
        parsedArray = jsonParsed;
      } else {
        parsedArray = [rawData];
      }
    } catch (e) {
      if (rawData.startsWith('{') && rawData.endsWith('}')) {
        parsedArray = rawData.slice(1, -1).split(',');
      } else {
        parsedArray = [rawData];
      }
    }
  }
  return parsedArray
    .map((url: any) => {
      if (typeof url !== 'string') return '';
      return url.replace(/(^['"]+|['"]+$)/g, '').trim();
    })
    .filter((url: string) => url.length > 0);
};

/* ============================================================
   EXPANDABLE TEXT COMPONENT
   ============================================================ */
const ExpandableText = memo(function ExpandableText({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxLength = 100;
  const lines = content.split('\n');
  const isLong = content.length > maxLength || lines.length > 2;

  useEffect(() => {
    if (!expanded || !containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setExpanded(false);
    }, { threshold: 0, rootMargin: "100px" });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [expanded]);

  if (!isLong) {
    return (
      <div className="px-4 py-2 text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap bg-[#0a0d10] break-words [word-break:break-word] [overflow-wrap:anywhere]">
        {content}
      </div>
    );
  }

  let truncatedContent = content;
  if (!expanded) {
    if (lines.length > 2 && lines[0].length + lines[1].length < maxLength) {
      truncatedContent = lines.slice(0, 2).join('\n');
    } else {
      truncatedContent = content.slice(0, maxLength);
    }
  }

  return (
    <div ref={containerRef} className="px-4 py-2 text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap bg-[#0a0d10] break-words [word-break:break-word] [overflow-wrap:anywhere] transition-all">
      {truncatedContent}
      {!expanded && <span className="opacity-70">... </span>}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-[#4fa8ff] font-semibold ml-1 active:scale-95 transition-all text-[13px]"
      >
        {expanded ? 'less' : 'more'}
      </button>
    </div>
  );
});

/* ============================================================
   IMAGE CAROUSEL FIXED DECK ANIMATION
   ============================================================ */
const DROP_Y       = 44;
const SCALE_STEP   = 0.06;
const OPACITY_STEP = 0.40;
const SNAP_VEL     = 0.30;
const SNAP_DIST    = 0.20;
const PULL_FACTOR  = 0.25;

interface ImageCarouselProps {
  images: string[];
  isNear: boolean;
}

const ImageCarousel = memo(function ImageCarousel({ images, isNear }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slidesRef    = useRef<(HTMLDivElement | null)[]>([]);
  const widthRef     = useRef(375);
  const rafRef       = useRef<number | null>(null);

  const g = useRef({
    pointerId:    null as number | null,
    active:       false,
    intent:       null as 'h' | 'v' | null,
    startX:       0,
    startY:       0,
    lastX:        0,
    lastTime:     0,
    velocity:     0,
    currentIndex: 0,
  });

  const imagesLenRef = useRef(images.length);
  useEffect(() => { imagesLenRef.current = images.length; }, [images.length]);

  useEffect(() => {
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  const paintSlides = useCallback((floatIndex: number, animate: boolean) => {
    slidesRef.current.forEach((slide, i) => {
      if (!slide) return;
      const d = i - floatIndex;
      const absD = Math.abs(d);
      if (absD > 2.5) {
        slide.style.visibility = 'hidden';
        return;
      }
      slide.style.visibility = 'visible';
      const scale = 1 - absD * SCALE_STEP;
      const opacity = Math.max(0, 1 - absD * OPACITY_STEP);

      slide.style.transition = animate
        ? 'transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 380ms ease'
        : 'none';
      slide.style.transform  = `translate3d(${d * 100}%, ${absD * DROP_Y}px, 0) scale(${scale})`;
      slide.style.opacity    = String(opacity);
    });
  }, []);

  const scheduleDragFrame = useCallback((offset: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const floatIndex = g.current.currentIndex - offset / (widthRef.current || 375);
      paintSlides(floatIndex, false);
    });
  }, [paintSlides]);

  const snapTo = useCallback((index: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const clamped = Math.max(0, Math.min(imagesLenRef.current - 1, index));
    g.current.currentIndex = clamped;

    rafRef.current = requestAnimationFrame(() => {
      paintSlides(clamped, true);
      setActiveIndex(clamped);
    });
  }, [paintSlides]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (g.current.pointerId !== null) return;
    if (containerRef.current) widthRef.current = containerRef.current.clientWidth || 375;
    g.current.pointerId = e.pointerId;
    g.current.active    = false;
    g.current.intent    = null;
    g.current.startX    = e.clientX;
    g.current.startY    = e.clientY;
    g.current.lastX     = e.clientX;
    g.current.lastTime  = performance.now();
    g.current.velocity  = 0;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = g.current;
    if (s.pointerId !== e.pointerId) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (!s.intent) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      s.intent = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (s.intent === 'h') {
        e.currentTarget.setPointerCapture(e.pointerId);
        s.active = true;
        s.startX = e.clientX;
        s.lastX  = e.clientX;
      } else {
        s.pointerId = null;
        return;
      }
    }

    if (!s.active) return;
    const now = performance.now();
    const dt  = Math.max(now - s.lastTime, 8);
    s.velocity = s.velocity * 0.5 + ((e.clientX - s.lastX) / dt) * 0.5;
    s.lastX    = e.clientX;
    s.lastTime = now;

    const W       = widthRef.current || 375;
    const atStart = s.currentIndex === 0;
    const atEnd   = s.currentIndex === imagesLenRef.current - 1;

    let offset = e.clientX - s.startX;
    if ((atStart && offset > 0) || (atEnd && offset < 0)) {
      const pull = W * PULL_FACTOR;
      offset = Math.sign(offset) * pull * Math.tanh(Math.abs(offset) / pull);
    }
    scheduleDragFrame(offset);
  }, [scheduleDragFrame]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = g.current;
    if (s.pointerId !== e.pointerId || !s.active) {
      s.pointerId = null;
      return;
    }
    s.active    = false;
    s.pointerId = null;

    const dx   = e.clientX - s.startX;
    const W    = widthRef.current || 375;
    let   next = s.currentIndex;

    if (s.velocity < -SNAP_VEL || dx < -(W * SNAP_DIST)) {
      next = Math.min(imagesLenRef.current - 1, next + 1);
    } else if (s.velocity > SNAP_VEL || dx > W * SNAP_DIST) {
      next = Math.max(0, next - 1);
    }
    snapTo(next);
  }, [snapTo]);

  const onPointerCancel = useCallback(() => {
    const s = g.current;
    s.active    = false;
    s.pointerId = null;
    snapTo(s.currentIndex);
  }, [snapTo]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt="Post"
        className="w-full h-auto object-cover max-h-[70vh] block"
        loading={isNear ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        // @ts-ignore
        fetchPriority={isNear ? 'high' : 'auto'}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden bg-zinc-950"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img src={images[0]} className="w-full h-auto max-h-[70vh] opacity-0 pointer-events-none block select-none" aria-hidden="true" draggable={false} />
      
      <div className="absolute inset-0">
        {images.map((url, i) => {
          const d = i - activeIndex;
          const absD = Math.abs(d);
          return (
            <div
              key={i}
              ref={(el) => { slidesRef.current[i] = el; }}
              className="absolute inset-0 w-full h-full flex justify-center items-center"
              style={{
                willChange: 'transform, opacity',
                transform: `translate3d(${d * 100}%, ${absD * DROP_Y}px, 0) scale(${1 - absD * SCALE_STEP})`,
                opacity: Math.max(0, 1 - absD * OPACITY_STEP),
                visibility: absD > 2.5 ? 'hidden' : 'visible'
              }}
            >
              <img
                src={url}
                alt={`Image ${i + 1} of ${images.length}`}
                className="w-full h-full object-cover block select-none pointer-events-none"
                loading={Math.abs(i - activeIndex) <= 1 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
              />
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-[5px] pointer-events-none z-10">
        {images.map((_, i) => (
          <div
            key={i}
            className="rounded-full bg-white transition-all duration-300 ease-out shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
            style={{
              width:   i === activeIndex ? 18 : 6,
              height:  6,
              opacity: i === activeIndex ? 1 : 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
});

/* ============================================================
   OPTIMISTIC LIKE BUTTON
   ============================================================ */
const LikeButton = ({ postId, initialLiked, initialCount }: { postId: string, initialLiked: boolean, initialCount: number }) => {
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
        toggleLike(postId).then((res) => {
          if (res?.success) serverState.current = newLikedState;
          else { setLiked(serverState.current); setCount(prev => serverState.current ? prev + 1 : prev - 1); }
        }).catch(() => { setLiked(serverState.current); setCount(prev => serverState.current ? prev + 1 : prev - 1); });
      }
    }, 500);
  };

  return (
    <div className="flex items-center gap-1.5 z-20 relative">
      <button onClick={handleLike} className="flex items-center justify-center p-1 group transition-all active:scale-90">
        <Heart className={`w-[26px] h-[26px] transition-colors ${liked ? "text-red-500 fill-red-500" : "text-zinc-100 group-hover:text-red-500"}`} />
      </button>
      {count > 0 && <span className="text-sm font-bold text-white mr-2">{count}</span>}
    </div>
  );
};

/* ============================================================
   POST ITEM COMPONENT
   ============================================================ */
const PostItem = memo(function PostItem({
  post, pfpUrl, slideRef, style, onMenuClick, index, currentIndex, onCommentClick, onLikesClick }: any) {
  
  const images = parsePostImages(post);
  const isNear = currentIndex !== null && Math.abs(currentIndex - index) <= 1;

  return (
    <div
      ref={slideRef}
      className="flex-none snap-start snap-always w-full flex flex-col overflow-y-auto overflow-x-hidden bg-black pb-16 box-border will-change-[transform,opacity]"
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0d10]">
        <div className="flex items-center">
          <img src={post.users?.avatar_url || pfpUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-zinc-800" />
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-1">
              <h4 className="font-bold text-sm text-white">{post.users?.full_name || 'User'}</h4>
              <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-500/20" />
              <span className="text-zinc-600 text-xs font-medium mx-0.5"> </span>
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{timeAgo(post.created_at)}</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">@{post.users?.username || 'user'}</p>
          </div>
        </div>
        <MoreHorizontal
          className="w-5 h-5 text-zinc-500 cursor-pointer hover:text-white transition-colors"
          onClick={(e) => {
             e.stopPropagation();
             if (onMenuClick) onMenuClick(post);
           }}
        />
      </div>

      {images.length > 0 && (
        <div className="w-full border-y border-zinc-900/50">
          <ImageCarousel images={images} isNear={isNear} />
        </div>
      )}

      <div className="px-3 pt-3 pb-2 flex items-center gap-4 bg-black shrink-0 relative z-10">
        <LikeButton postId={post.id} initialLiked={post.hasLiked} initialCount={post.likeCount} />
        
        <div className="flex items-center gap-1.5 z-20 relative">
          <button onClick={() => onCommentClick(post.id)} className="flex items-center justify-center p-1 group transition-all active:scale-95">
            <MessageSquare className="w-[26px] h-[26px] text-zinc-100 group-hover:text-[#4fa8ff] transition-colors" />
          </button>
          {post.commentCount > 0 && (
            <span className="text-sm font-bold text-white mr-2">
              {formatCount(post.commentCount)}
            </span>
          )}
        </div>
        
        <button className="hover:bg-zinc-800 transition-colors active:scale-95 ml-auto p-1 rounded-full">
          <Send className="w-[26px] h-[26px] text-zinc-100 hover:text-[#4fa8ff]" />
        </button>
      </div>

      <LikersText likers={post.likers || []} onClick={() => onLikesClick(post.id)} />

      <div className="px-4 pb-4">
        {post.content && (
          <div className="-mx-4"><ExpandableText content={post.content} /></div>
        )}
      </div>
    </div>
  );
});

/* ============================================================
   PUBLIC PROFILE PAGE MAIN CONTAINER
   ============================================================ */
export default function PublicProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PublicProfileContent />
    </Suspense>
  );
}

function PublicProfileContent() {
  const params = useParams();
  const usernameParam = typeof params.username === 'string' ? params.username : Array.isArray(params.username) ? params.username[0] : '';
  const router = useRouter();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState('posts');
  const [peekPost, setPeekPost] = useState<any | null>(null);
  const [isPeekingAnim, setIsPeekingAnim] = useState(false);
  
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeLikesPostId, setActiveLikesPostId] = useState<string | null>(null);

  const [pressedGridId, setPressedGridId] = useState<string | null>(null);
  const [feedViewIndex, setFeedViewIndex] = useState<number | null>(null);
  const [feedHeight, setFeedHeight] = useState(0);
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedAnimIn, setFeedAnimIn] = useState(false);

  // Gesture & Optimization Refs
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);
  const justPeeked = useRef(false);
  const tapStartPos = useRef({ x: 0, y: 0 });
  const feedScrollRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feedViewIndexRef = useRef<number | null>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_MS = 500;

  const commentDrag = useSheetDrag(!!activeCommentPostId, () => setActiveCommentPostId(null), { closeThreshold: 150, opacityDivisor: 500 });
  const likesDrag = useSheetDrag(!!activeLikesPostId, () => setActiveLikesPostId(null), { closeThreshold: 150, opacityDivisor: 500 });

  // 1. Fetch user profile by username
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['public-profile', usernameParam],
    queryFn: () => getUserProfileByUsername(usernameParam),
    enabled: !!usernameParam,
  });

  // 2. Fetch user posts once profile is resolved
   const { data: userPosts = [], isLoading: isPostsLoading } = useQuery({
    queryKey: ['public-posts', userProfile?.id],
    // Add the ! after userProfile to assure TypeScript it exists
    queryFn: () => getUserPosts(userProfile!.id), 
    enabled: !!userProfile?.id,
  });

  const isOwner = session?.user?.id === userProfile?.id;

  // Background Scrolling locks
  useEffect(() => {
    if (peekPost !== null || feedVisible || activeCommentPostId || activeLikesPostId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [peekPost, feedVisible, activeCommentPostId, activeLikesPostId]);

  useEffect(() => {
    const container = feedScrollRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => setFeedHeight(container.clientHeight));
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, post: any) => {
    setPressedGridId(post.id);
    isDragging.current = false;
    justPeeked.current = false;
    tapStartPos.current = { x: e.clientX, y: e.clientY };
    
    pressTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        setPeekPost(post);
        setTimeout(() => setIsPeekingAnim(true), 10);
        justPeeked.current = true;
      }
    }, LONG_PRESS_MS);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = Math.abs(e.clientX - tapStartPos.current.x);
    const dy = Math.abs(e.clientY - tapStartPos.current.y);
    
    if (dx > 6 || dy > 6) {
      setPressedGridId(null);
      isDragging.current = true;
      if (pressTimer.current) clearTimeout(pressTimer.current);
    }
  }, []);

  const handlePointerUp = useCallback((index: number) => {
    setPressedGridId(null);
    if (pressTimer.current) clearTimeout(pressTimer.current);

    if (isPeekingAnim || justPeeked.current) {
      setIsPeekingAnim(false);
      setTimeout(() => setPeekPost(null), 300);
      justPeeked.current = false;
      isDragging.current = false;
      return;
    }

    if (!isDragging.current) {
      if (feedScrollRef.current) {
        const h = feedScrollRef.current.clientHeight || window.innerHeight;
        setFeedHeight(h);
        feedScrollRef.current.scrollTop = h * index;
        
        slideRefs.current.forEach((slide, i) => {
          if (!slide) return;
          const dist = Math.min(Math.abs(index - i), 1);
          slide.style.transform = `scale(${1 - dist * 0.03})`;
          slide.style.opacity = String(1 - dist * 0.5);
        });
      }
      setFeedViewIndex(index);
      feedViewIndexRef.current = index;
      setFeedVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setFeedAnimIn(true));
      });
    }
    isDragging.current = false;
  }, [isPeekingAnim]);

  const handlePointerCancel = useCallback(() => {
    setPressedGridId(null);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    isDragging.current = false;
    
    if (isPeekingAnim || justPeeked.current) {
      setIsPeekingAnim(false);
      setTimeout(() => setPeekPost(null), 300);
      justPeeked.current = false;
    }
  }, [isPeekingAnim]);

  const closeFeedView = useCallback(() => {
    setFeedAnimIn(false);
    setTimeout(() => {
      setFeedVisible(false);
      setFeedViewIndex(null);
      feedViewIndexRef.current = null;
    }, 420);
  }, []);

  const handleFeedScroll = useCallback(() => {
    const container = feedScrollRef.current;
    if (!container || !feedHeight) return;

    requestAnimationFrame(() => {
      const currentScroll = container.scrollTop / feedHeight;
      const activeIdx = Math.round(currentScroll);

      const minIdx = Math.max(0, Math.floor(currentScroll) - 1);
      const maxIdx = Math.min(slideRefs.current.length - 1, Math.ceil(currentScroll) + 1);

      for (let i = minIdx; i <= maxIdx; i++) {
        const slide = slideRefs.current[i];
        if (!slide) continue;
        const dist = Math.min(Math.abs(currentScroll - i), 1);
        slide.style.transform = `scale(${1 - dist * 0.03})`;
        slide.style.opacity = String(1 - dist * 0.5);
      }

      if (activeIdx !== feedViewIndexRef.current) {
        feedViewIndexRef.current = activeIdx;
      }
    });

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setFeedViewIndex(feedViewIndexRef.current);
    }, 75);
  }, [feedHeight]);

  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">User Not Found</h2>
        <p className="text-zinc-500 text-sm mb-6">The handle @{usernameParam} doesn't match any active profiles.</p>
        <button onClick={() => router.back()} className="px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold transition-all active:scale-95">
          Go Back
        </button>
      </div>
    );
  }

  const pfpUrl = userProfile.avatar_url || generateDefaultAvatar(userProfile.username);
  const bannerUrl = userProfile.banner_url || generateDefaultBanner(userProfile.username);
  
  const userPoints = [2510, 2580, 2540, 2650, 2720, 2690, 2780, 2847];
  const currentMmr = userPoints[userPoints.length - 1];
  const currentRankIndex = RANK_TIERS.reduce((acc, tier, idx) => (currentMmr >= tier.minMmr ? idx : acc), 0);
  const currentTier = RANK_TIERS[currentRankIndex];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-white/20 pb-24 relative">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <ProfileEffect effectType={userProfile.profile_effect || 'none'} />

      <PeekPostModal post={peekPost} isVisible={isPeekingAnim} pfpUrl={pfpUrl} />

      {/* FULL-SCREEN FEED MODAL CONTAINER */}
      <div
        className="fixed inset-0 flex flex-col bg-black will-change-transform"
        style={{
          zIndex: feedVisible ? 100 : -50,
          opacity: feedAnimIn ? 1 : 0,
          pointerEvents: feedVisible ? 'auto' : 'none',
          transform: feedAnimIn ? 'scale(1) translateY(0px)' : 'scale(0.90) translateY(24px)',
          transition: feedAnimIn
            ? 'opacity 180ms ease-out, transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'opacity 300ms ease-out, transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/80 bg-[#0a0d10] z-20 shrink-0"
          style={{
            opacity: feedAnimIn ? 1 : 0,
            transform: feedAnimIn ? 'translateY(0)' : 'translateY(-14px)',
            transition: feedAnimIn
              ? 'opacity 200ms 60ms ease-out, transform 380ms 60ms cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'opacity 200ms ease-out, transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <button onClick={closeFeedView} className="p-1.5 -ml-1.5 rounded-full text-white hover:bg-zinc-800 transition-colors active:scale-90">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="text-center flex-1">
            <h2 className="font-bold text-base text-white">Posts</h2>
          </div>
          <div className="w-8" />
        </div>
        
        <div
          ref={feedScrollRef}
          onScroll={handleFeedScroll}
          className="flex-1 w-full flex flex-col overflow-y-auto snap-y snap-mandatory hide-scrollbar overscroll-none relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {userPosts.map((post: any, i: number) => {
            const initialDist = Math.min(Math.abs((feedViewIndex || 0) - i), 1);
            return (
              <PostItem
                key={post.id} post={post} pfpUrl={pfpUrl} index={i} currentIndex={feedViewIndex}
                slideRef={(el: HTMLDivElement | null) => { slideRefs.current[i] = el; }}
                style={{
                  height: feedHeight ? `${feedHeight}px` : '100dvh',
                  transform: `scale(${1 - initialDist * 0.03})`,
                  opacity: 1 - initialDist * 0.5,
                }}
                onMenuClick={() => {}}
                onCommentClick={setActiveCommentPostId}
                onLikesClick={setActiveLikesPostId}
              />
            );
          })}
        </div>
      </div>

      <div className="max-w-xl mx-auto min-h-screen flex flex-col relative z-10 overflow-x-hidden">
        {/* Banner Container */}
        <div className="relative">
          <div className="h-36 w-full relative overflow-hidden bg-black flex justify-center items-center">
            <div className="absolute w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${bannerUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />

            {/* Back Button */}
            <button onClick={() => router.back()} className="absolute top-4 left-4 z-30 p-2 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white transition-all active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Rank Badge */}
            <div className="absolute right-3 sm:right-12 bottom-3 sm:bottom-4 flex flex-col items-center justify-center z-20 group cursor-default">
              <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full blur-2xl opacity-60" style={{ backgroundColor: currentTier.color }} />
              <div className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-black/40 to-black/80">
                <Crown size={28} color={currentTier.color} className="sm:hidden relative z-10 mb-1" style={{ fill: `${currentTier.color}50` }} />
                <Crown size={44} color={currentTier.color} className="hidden sm:block relative z-10 mb-3 mt-1" style={{ fill: `${currentTier.color}50` }} />
                <span className="absolute bottom-1.5 sm:bottom-2.5 z-10 text-[8px] sm:text-[10px] font-black tracking-[0.2em] uppercase">{currentTier.name}</span>
              </div>
            </div>
          </div>

          {/* Profile Picture Header Row */}
          <div className="px-4 flex justify-between items-center -mt-10 relative z-10">
            <div className="relative">
              <div className="w-[88px] h-[88px] rounded-full p-1 bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500">
                <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                  <img src={pfpUrl} alt={userProfile.full_name} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <div className="flex gap-6 text-center mr-4 pt-8">
              <div className="flex flex-col"><span className="font-bold text-lg leading-tight">{userPosts.length}</span><span className="text-xs text-zinc-400">Posts</span></div>
              <div className="flex flex-col"><span className="font-bold text-lg leading-tight">48</span><span className="text-xs text-zinc-400">Teamed</span></div>
              <div className="flex flex-col"><span className="font-bold text-lg leading-tight">2</span><span className="text-xs text-zinc-400">Hubs</span></div>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="px-4 pt-3 space-y-3">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-1">{userProfile.full_name || 'User'} <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" /></h1>
            <p className="text-sm text-zinc-400 font-medium">@{userProfile.username}</p>
          </div>
          {userProfile.bio && <p className="text-[14px] leading-snug whitespace-pre-wrap">{userProfile.bio}</p>}
          {userProfile.websites && userProfile.websites.some((url: string) => url.trim() !== '') && (
            <div className="flex flex-wrap gap-2 mt-2">
              {userProfile.websites.filter((site: string) => site.trim() !== '').map((site: string, i: number) => {
                const href = site.startsWith('http') ? site : `https://${site}`;
                const displayLabel = site.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                return (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-all">
                    <LinkIcon className="w-3 h-3" /> {displayLabel}
                  </a>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {isOwner ? (
              <button onClick={() => router.push('/profile')} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2 rounded-xl text-sm transition-all active:scale-95 border border-zinc-800">
                Manage Profile
              </button>
            ) : (
              <>
                <button className="flex-1 bg-[#4fa8ff] text-black font-bold py-2 rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" /> Team Up
                </button>
                <button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all active:scale-95 border border-zinc-800 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Posts and Sandbox Tabs */}
        <div className="flex justify-around border-b border-zinc-900 mt-4">
          <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 flex justify-center transition-colors ${activeTab === 'posts' ? 'border-b-[1px] border-white text-white' : 'text-zinc-500'}`}>
            <Grid className="w-6 h-6" />
          </button>
          <button onClick={() => setActiveTab('sandbox')} className={`flex-1 py-3 flex justify-center transition-colors ${activeTab === 'sandbox' ? 'border-b-[1px] border-white text-white' : 'text-zinc-500'}`}>
            <FolderGit2 className="w-6 h-6" />
          </button>
        </div>

        {/* Posts Grid */}
        <div className="flex-1 w-full min-h-[300px] bg-black">
          {activeTab === 'posts' && (
            <div className="pt-0.5 pb-20 bg-black">
              {isPostsLoading ? (
                <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
              ) : userPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
                  <Grid className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No posts dropped yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-[2px]">
                  {userPosts.map((post: any, index: number) => {
                    const postImages = parsePostImages(post);
                    return (
                      <div
                        key={post.id}
                        onPointerDown={(e) => handlePointerDown(e, post)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={() => handlePointerUp(index)}
                        onPointerCancel={handlePointerCancel}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`aspect-square bg-zinc-900 cursor-pointer overflow-hidden relative group touch-manipulation transition-transform duration-150 select-none ${pressedGridId === post.id ? 'scale-[0.94]' : 'scale-100'}`}
                        style={{ WebkitTouchCallout: 'none' }}
                      >
                        {postImages.length > 0 ? (
                          <img
                            src={postImages[0]}
                            alt="Post"
                            draggable={false}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px] text-zinc-400 bg-zinc-900 group-hover:bg-zinc-800 transition-colors pointer-events-none">
                            <p className="line-clamp-3 leading-tight pointer-events-none">{post.content}</p>
                          </div>
                        )}
                        {postImages.length > 1 && (
                          <div className="absolute top-1.5 right-1.5 bg-black/50 p-1 rounded backdrop-blur-sm pointer-events-none">
                            <svg className="w-3 h-3 text-white fill-white pointer-events-none" viewBox="0 0 24 24"><path d="M4 4h12v12H4V4zm2 2v8h8V6H6zm14-2h-2v14H6v2h14V4z"/></svg>
                          </div>
                        )}
                        {postImages.length === 1 && post.content && (
                          <div className="absolute top-1.5 right-1.5 bg-black/50 p-1 rounded backdrop-blur-sm pointer-events-none">
                            <MessageSquare className="w-3 h-3 text-white pointer-events-none" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CommentSheet
        isOpen={!!activeCommentPostId}
        drag={commentDrag}
        onClose={() => setActiveCommentPostId(null)}
        postId={activeCommentPostId}
        currentUserAvatar={session?.user?.image || pfpUrl}
      />
      <LikesSheet
        isOpen={!!activeLikesPostId}
        drag={likesDrag}
        onClose={() => setActiveLikesPostId(null)}
        postId={activeLikesPostId}
      />
    </div>
  );
}