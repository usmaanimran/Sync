"use client";
import React, { useState, useRef, useEffect, useCallback, memo, Suspense } from 'react';import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import getCroppedImg from '@/utils/cropImage';
import { updateAvatarUrl, updateBannerUrl, getUserProfile, updateProfileData, updateProfileEffect } from "../actions/profile";
import { isUsernameAvailable } from "../actions/auth";
import { createPost, getUserPosts, updatePost, deletePost } from "../actions/post";
import ProfileEffect from './ProfileEffect';
import RankHUD from './RankHUD';
import CropperModal from './CropperModal';
import PeekPostModal from './PeekPostModal';
import CreatePostSheet from './CreatePostSheet';
import EditProfileSheet from './EditProfileSheet';
import AvatarMenuSheet from './AvatarMenuSheet';
import BannerMenuSheet from './BannerMenuSheet';
import CustomizeSheet from './CustomizeSheet';
import useSheetDrag from './useSheetDrag';
import CommentSheet from '../home/CommentSheet';
import LikesSheet from '../home/LikesSheet';
import { ProfileDraft } from './types';
import { getCloudinarySignature } from '../actions/cloudinary';
import { timeAgo, RANK_TIERS, generateDefaultAvatar, generateDefaultBanner } from './helpers';
import { toggleLike } from "../actions/engagement";
import {
  Settings, Grid, FolderGit2, CheckCircle2,
  Link as LinkIcon, Cpu, Crown, Heart, MessageSquare, Send, ChevronLeft, MoreHorizontal, PlusSquare, Trash2, Edit2
} from 'lucide-react';

 export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}


/* ============================================================
   LIKERS TEXT (Overlapping UI)
   ============================================================ */
const LikersText = ({ likers, isOwner, onClick }: { likers: any[], isOwner?: boolean, onClick: () => void }) => {
  // Completely hide this if the user doesn't own the post or if there are 0 likes
  if (isOwner === false || !likers || likers.length === 0) return null;

  // Backwards compatibility mapper just in case it receives raw strings
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
      {/* Overlapping Avatars Container */}
      <div className={`relative shrink-0 flex items-center justify-center ${formattedLikers.length === 1 ? 'w-5 h-5' : 'w-7 h-7'}`}>
        {formattedLikers.length === 1 ? (
          <img 
            src={formattedLikers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[0].username}&backgroundColor=ffffff`} 
            className="w-5 h-5 rounded-full object-cover" 
            alt="avatar"
          />
        ) : (
          <>
            {/* Back Avatar (Top Left) */}
            <img 
              src={formattedLikers[0].avatar_url || `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${formattedLikers[0].username}&backgroundColor=ffffff`} 
              className="w-5 h-5 rounded-full object-cover absolute top-0 left-0 z-0" 
              alt="avatar"
            />
            {/* Front Avatar (Bottom Right with border cutout) */}
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

/* ============================================================
   POST IMAGES PARSER HELPER
   ============================================================ */
const parsePostImages = (post: any) => {
  const rawData = post.image_urls || post.image_url;
  if (!rawData) return [];
  let parsedArray = [];
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

/* ============================================================
   POST ITEM COMPONENT
   ============================================================ */
const PostItem = memo(function PostItem({
  post, pfpUrl, slideRef, style, onMenuClick, index, currentIndex, onCommentClick, onLikesClick
}: any) {
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
            onMenuClick(post); 
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
        
        <button onClick={() => onCommentClick(post.id)} className="flex items-center gap-2 group transition-all active:scale-95">
          <MessageSquare className="w-[26px] h-[26px] text-zinc-100 group-hover:text-[#4fa8ff] transition-colors" />
        </button>
        <button className="hover:bg-zinc-800 transition-colors active:scale-95 ml-auto p-1 rounded-full">
          <Send className="w-[26px] h-[26px] text-zinc-100 hover:text-[#4fa8ff]" />
        </button>
      </div>

      {/* Renders Likers Breakdown */}
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
   MAIN PROFILE PAGE
   ============================================================ */
function ProfileContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pressedGridId, setPressedGridId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isProfileFetching, setIsProfileFetching] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isBannerMenuOpen, setIsBannerMenuOpen] = useState(false);
  const [isCustomizeMenuOpen, setIsCustomizeMenuOpen] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropType, setCropType] = useState<'avatar' | 'banner' | 'post'>('avatar');

  const [pfpUrl, setPfpUrl] = useState(generateDefaultAvatar('Nexus'));
  const [bannerUrl, setBannerUrl] = useState(generateDefaultBanner('Nexus'));
  const [profileData, setProfileData] = useState<ProfileDraft>({ name: '', username: '', bio: '', websites: [''], profile_effect: 'none' });
  const [draftProfile, setDraftProfile] = useState<ProfileDraft>({ name: '', username: '', bio: '', websites: [''], profile_effect: 'none' });
  const [originalUsername, setOriginalUsername] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState("");

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isPostsFetching, setIsPostsFetching] = useState(true);

  // Sheets & Action States
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [draftPostFiles, setDraftPostFiles] = useState<File[]>([]);
  const [draftPostPreviews, setDraftPostPreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const postInputRef = useRef<HTMLInputElement>(null);
  
  const [postOptionsMenu, setPostOptionsMenu] = useState<any | null>(null);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [urlsToDelete, setUrlsToDelete] = useState<string[]>([]);

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeLikesPostId, setActiveLikesPostId] = useState<string | null>(null);

  // Feed & Modals
  const [peekPost, setPeekPost] = useState<any | null>(null);
  const [isPeekingAnim, setIsPeekingAnim] = useState(false);
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

  const editDrag = useSheetDrag(isEditing, () => setIsEditing(false), { closeThreshold: 150, opacityDivisor: 500 });
  const avatarDrag = useSheetDrag(isAvatarMenuOpen, () => setIsAvatarMenuOpen(false), { closeThreshold: 100, opacityDivisor: 300 });
  const bannerDrag = useSheetDrag(isBannerMenuOpen, () => setIsBannerMenuOpen(false), { closeThreshold: 100, opacityDivisor: 300 });
  const customizeDrag = useSheetDrag(isCustomizeMenuOpen, () => setIsCustomizeMenuOpen(false), { closeThreshold: 150, opacityDivisor: 500 });
  const createPostDrag = useSheetDrag(isCreatePostOpen, () => setIsCreatePostOpen(false), { closeThreshold: 150, opacityDivisor: 500 });
  const editPostDrag = useSheetDrag(isEditPostOpen, () => setIsEditPostOpen(false), { closeThreshold: 150, opacityDivisor: 500 });
  const postOptionsDrag = useSheetDrag(!!postOptionsMenu, () => setPostOptionsMenu(null), { closeThreshold: 100, opacityDivisor: 300 });
  const commentDrag = useSheetDrag(!!activeCommentPostId, () => setActiveCommentPostId(null), { closeThreshold: 150, opacityDivisor: 500 });
  const likesDrag = useSheetDrag(!!activeLikesPostId, () => setActiveLikesPostId(null), { closeThreshold: 150, opacityDivisor: 500 });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Handle Background Scrolling locks
  useEffect(() => {
    if (isEditing || isAvatarMenuOpen || isCropperOpen || isBannerMenuOpen || isCustomizeMenuOpen || isCreatePostOpen || isEditPostOpen || postOptionsMenu !== null || peekPost !== null || feedVisible || activeCommentPostId || activeLikesPostId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isEditing, isAvatarMenuOpen, isCropperOpen, isBannerMenuOpen, isCustomizeMenuOpen, isCreatePostOpen, isEditPostOpen, postOptionsMenu, peekPost, feedVisible, activeCommentPostId, activeLikesPostId]);

  // Deep Link Notification Listener
  useEffect(() => {
    const targetPostId = searchParams.get('postId');
    const sheetToOpen = searchParams.get('open');

    if (targetPostId && userPosts.length > 0) {
      // Find the specific post in the current user's profile feed
      const postIndex = userPosts.findIndex((p: any) => p.id === targetPostId);
      
      if (postIndex !== -1) {
        // Snap the Feed open directly to this post index
        setFeedViewIndex(postIndex);
        feedViewIndexRef.current = postIndex;
        setFeedVisible(true);
        
        requestAnimationFrame(() => {
          setFeedAnimIn(true);
          // Scroll the feed to exactly this post
          if (feedScrollRef.current) {
            const h = feedScrollRef.current.clientHeight || window.innerHeight;
            setFeedHeight(h);
            feedScrollRef.current.scrollTop = h * postIndex;
          }
        });

        // Trigger the requested sheet overlapping the feed
        if (sheetToOpen === 'likes') setActiveLikesPostId(targetPostId);
        if (sheetToOpen === 'comments') setActiveCommentPostId(targetPostId);
        
        // Remove the params from the URL to prevent triggering again on a refresh
        window.history.replaceState(null, '', '/profile');
      }
    }
  }, [searchParams, userPosts]);

  useEffect(() => {
    const container = feedScrollRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => setFeedHeight(container.clientHeight));
    ro.observe(container);
    return () => ro.disconnect();
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

  const userId = (session?.user as any)?.id;

  const { data: fetchedProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
  });

  const { data: fetchedPosts, isLoading: isPostsLoading } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => getUserPosts(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (fetchedProfile) {
      const formattedData = {
        name: fetchedProfile.full_name || '',
        username: fetchedProfile.username || '',
        bio: fetchedProfile.bio || '',
        websites: fetchedProfile.websites && fetchedProfile.websites.length > 0 ? fetchedProfile.websites : [''],
        profile_effect: fetchedProfile.profile_effect || 'none'
      };
      setProfileData(formattedData);
      setDraftProfile(formattedData);
      setOriginalUsername(fetchedProfile.username || '');
      
      setPfpUrl(fetchedProfile.avatar_url || generateDefaultAvatar(fetchedProfile.username));
      setBannerUrl(fetchedProfile.banner_url || generateDefaultBanner(fetchedProfile.username));
      
      setIsProfileFetching(false);
    } else if (status !== "loading" && userId && !isProfileLoading) {
      signOut({ callbackUrl: "/login" });
    }
  }, [fetchedProfile, status, userId, isProfileLoading]);

  useEffect(() => {
    if (fetchedPosts) {
      setUserPosts(fetchedPosts);
      setIsPostsFetching(false);
    }
  }, [fetchedPosts]);

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

  const openEditModal = useCallback(() => {
    setDraftProfile(profileData);
    setSaveError("");
    setUsernameAvailable(null);
    setIsEditing(true);
  }, [profileData]);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner' | 'post') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageSrc(URL.createObjectURL(file));
      setCropType(type);
      setIsCropperOpen(true);
      setIsAvatarMenuOpen(false);
      setIsBannerMenuOpen(false);
    }
  }, []);

  const closeCropper = useCallback(() => {
    setIsCropperOpen(false);
    setTimeout(() => setImageSrc(null), 500);
  }, []);

  const handleCropAndUpload = useCallback(async (croppedAreaPixels: any) => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsUploading(true);
    
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, cropType);
      if (!croppedFile) throw new Error("Cropping failed");
      if (cropType === 'post') {
        const localPreviewUrl = URL.createObjectURL(croppedFile);
        setDraftPostFiles(prev => [...prev, croppedFile]);
        setDraftPostPreviews(prev => [...prev, localPreviewUrl]);
        closeCropper();
      } else {
        const targetFolder = cropType === 'avatar' ? 'nexus_pfps' : cropType === 'banner' ? 'nexus_banners' : 'nexus_posts';
        const sig = await getCloudinarySignature(cropType, targetFolder);
        
        if (!sig.success) throw new Error(sig.error || "Signature generation failed");
        const formData = new FormData();
        formData.append("file", croppedFile);
        formData.append("api_key", sig.apiKey!);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature!);
        formData.append("folder", sig.folder!);
        formData.append("public_id", sig.publicId!);
        const cloudinaryResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        const data = await cloudinaryResponse.json();
        const secureImageUrl = data.secure_url;
        if (cropType === 'avatar') {
          setPfpUrl(secureImageUrl);
          closeCropper();
          await updateAvatarUrl(secureImageUrl);
        } else if (cropType === 'banner') {
          setBannerUrl(secureImageUrl);
          closeCropper();
          await updateBannerUrl(secureImageUrl);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }, [imageSrc, cropType, closeCropper]);

  const handlePublishPost = useCallback(async () => {
    if (!postContent.trim() && draftPostFiles.length === 0) return;
    setIsPosting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of draftPostFiles) {
        const sig = await getCloudinarySignature("post", "nexus_posts");
        if (!sig.success) throw new Error(sig.error || "Signature generation failed");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sig.apiKey!);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature!);
        formData.append("folder", sig.folder!);
        formData.append("public_id", sig.publicId!);
        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: formData });
        const data = await cloudinaryResponse.json();
        uploadedUrls.push(data.secure_url);
      }
      const result = await createPost(postContent, uploadedUrls);
      
      if (result.success && result.post) {
        setPostContent("");
        setDraftPostFiles([]);
        setDraftPostPreviews([]);
        setIsCreatePostOpen(false);
        
        const newPost = {
          ...result.post,
          users: {
            full_name: profileData.name,
            username: profileData.username,
            avatar_url: pfpUrl
          }
        };
        setUserPosts(prev => [newPost, ...prev]);
      } else {
        alert("Database Error: " + result.error);
      }
    } catch (error) {
      console.error("Failed to post:", error);
      alert("Network or Upload Error: " + (error as Error).message);
    } finally {
      setIsPosting(false);
    }
  }, [postContent, draftPostFiles, profileData, pfpUrl]);

  const handleEditPostClick = useCallback((post: any) => {
    setEditingPostId(post.id);
    setPostContent(post.content || "");
    const parsedUrls = parsePostImages(post);
    setExistingUrls(parsedUrls);
    setUrlsToDelete([]);
    setDraftPostFiles([]);
    setDraftPostPreviews([]);
    setIsEditPostOpen(true);
  }, []);

  const handleUpdatePost = useCallback(async () => {
    if (!editingPostId) return;
    setIsPosting(true);
    try {
      const newlyUploadedUrls: string[] = [];
      for (const file of draftPostFiles) {
        const sig = await getCloudinarySignature("post", "nexus_posts");
        if (!sig.success) throw new Error(sig.error || "Signature generation failed");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sig.apiKey!);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature!);
        formData.append("folder", sig.folder!);
        formData.append("public_id", sig.publicId!);
        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: formData });
        const data = await cloudinaryResponse.json();
        newlyUploadedUrls.push(data.secure_url);
      }
      const finalUrls = [...existingUrls, ...newlyUploadedUrls];
      const result = await updatePost(editingPostId, postContent, finalUrls, urlsToDelete);
      
      if (result.success && result.post) {
        setUserPosts(prev => prev.map(p => p.id === editingPostId ? {
          ...result.post,
          users: p.users
        } : p));
        setIsEditPostOpen(false);
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsPosting(false);
    }
  }, [editingPostId, postContent, existingUrls, draftPostFiles, urlsToDelete]);

  const handleDeletePost = useCallback(async (post: any) => {
    if (!post) return;
    setIsPosting(true);
    try {
      const urlsToNuke = parsePostImages(post);
      const result = await deletePost(post.id, urlsToNuke);
      if (result.success) {
        setUserPosts(prev => prev.filter(p => p.id !== post.id));
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setIsPosting(false);
    }
  }, []);

  const handleRemoveExistingUrl = useCallback((index: number) => {
    const urlRemoved = existingUrls[index];
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
    setUrlsToDelete(prev => [...prev, urlRemoved]);
  }, [existingUrls]);

  const handleRemoveDraftUrl = useCallback((index: number) => {
    setDraftPostPreviews(prev => prev.filter((_, i) => i !== index));
    setDraftPostFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveProfile = useCallback(async () => {
  if (usernameAvailable === false) return;
  if (!draftProfile.name.trim()) {
    setSaveError("Name cannot be empty.");
    return;
  }
  if (draftProfile.username.trim().length < 3) {
    setSaveError("Username must be at least 3 characters.");
    return;
  }
  setSaveError("");
  const result = await updateProfileData(draftProfile);
    
  if (result.success) {
      setProfileData(draftProfile);
      setOriginalUsername(draftProfile.username);
      setIsEditing(false);
    } else {
      setSaveError(result.error || "Failed to update profile.");
    }
  }, [usernameAvailable, draftProfile]);

  const userPoints = [2510, 2580, 2540, 2650, 2720, 2690, 2780, 2847];
  const currentMmr = userPoints[userPoints.length - 1];
  const currentRankIndex = RANK_TIERS.reduce((acc, tier, idx) => (currentMmr >= tier.minMmr ? idx : acc), 0);
  const currentTier = RANK_TIERS[currentRankIndex];
  const trophyHighlights = [
    { name: 'Codemania', img: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=150&h=150&fit=crop', ring: 'bg-gradient-to-tr from-yellow-400 to-orange-500' },
    { name: 'CyberQuest', img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&h=150&fit=crop', ring: 'bg-gradient-to-tr from-blue-500 to-cyan-400' },
    { name: 'UE5 Build', img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&h=150&fit=crop', ring: 'bg-zinc-700' },
    { name: 'Zypher', img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop', ring: 'bg-zinc-700' },
  ];

  if (status === "loading" || isProfileFetching) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-white/20 pb-24">
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      
      <ProfileEffect effectType={profileData.profile_effect} />

      {isMounted && (
        <>
          <CropperModal
            isOpen={isCropperOpen}
            cropType={cropType}
            imageSrc={imageSrc}
            onCancel={closeCropper}
            onDone={handleCropAndUpload}
            isProcessing={isUploading}
          />
          <PeekPostModal post={peekPost} isVisible={isPeekingAnim} pfpUrl={pfpUrl} />
          
          <CreatePostSheet
            isOpen={isCreatePostOpen} drag={createPostDrag} onClose={() => setIsCreatePostOpen(false)}
            content={postContent} onContentChange={setPostContent} onChooseImage={() => postInputRef.current?.click()}
            postImageUrls={draftPostPreviews}
            onRemoveImage={handleRemoveDraftUrl}
            onPost={handlePublishPost} isUploading={isUploading} isPosting={isPosting}
          />
          <CreatePostSheet
            isOpen={isEditPostOpen} drag={editPostDrag} onClose={() => setIsEditPostOpen(false)}
            content={postContent} onContentChange={setPostContent} onChooseImage={() => postInputRef.current?.click()}
            postImageUrls={[...existingUrls, ...draftPostPreviews]}
            onRemoveImage={(idx) => {
              if (idx < existingUrls.length) {
                handleRemoveExistingUrl(idx);
              } else {
                handleRemoveDraftUrl(idx - existingUrls.length);
              }
            }}
            onPost={handleUpdatePost} isUploading={isUploading} isPosting={isPosting}
          />
          <div className={`fixed inset-0 z-[120] flex flex-col justify-end overflow-hidden ${postOptionsMenu ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div
              ref={postOptionsDrag.backdropRef}
              className="absolute inset-0 bg-black/70" 
              style={postOptionsDrag.backdropStyle}
              onClick={() => setPostOptionsMenu(null)}
            />
            <div
              ref={postOptionsDrag.sheetRef}
              className="absolute bottom-0 left-0 right-0 bg-[#0a0d10] rounded-t-[28px] flex flex-col pb-10 border-t border-zinc-800/60"
              style={postOptionsDrag.sheetStyle}
            >
              <div
                className="w-full pt-3 px-6 pb-4 cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
                onTouchStart={postOptionsDrag.handleTouchStart}
                onTouchMove={postOptionsDrag.handleTouchMove}
                onTouchEnd={postOptionsDrag.handleTouchEnd}
              >
                <div className="w-12 h-[5px] bg-zinc-700 rounded-full mx-auto mb-4 pointer-events-none" />
                <h3 className="text-center font-bold text-lg text-white tracking-tight pointer-events-none">Post Options</h3>
              </div>
              <div className="px-6 space-y-2">
                <button
                  onClick={() => {
                    handleEditPostClick(postOptionsMenu);
                    setPostOptionsMenu(null);
                  }}
                  className="flex items-center gap-4 w-full py-4 text-white font-semibold text-left border-b border-zinc-800/60 hover:bg-zinc-800/30 active:scale-95 transition-all rounded-xl px-4"
                >
                  <div className="p-2 bg-blue-500/10 rounded-full"><Edit2 className="w-5 h-5 text-blue-400" /></div>
                  Edit Post
                </button>
                <button
                  onClick={() => {
                    handleDeletePost(postOptionsMenu);
                    setPostOptionsMenu(null);
                  }}
                  className="flex items-center gap-4 w-full py-4 text-red-400 font-semibold text-left hover:bg-red-500/10 active:scale-95 transition-all rounded-xl px-4"
                >
                  <div className="p-2 bg-red-500/10 rounded-full"><Trash2 className="w-5 h-5 text-red-400" /></div>
                  Delete Post
                </button>
              </div>
            </div>
          </div>
          <input type="file" ref={postInputRef} accept="image/*" onChange={(e) => onFileChange(e, 'post')} className="hidden" />
          
          <EditProfileSheet
            isOpen={isEditing} drag={editDrag} draftProfile={draftProfile} onDraftChange={(patch) => setDraftProfile(prev => ({ ...prev, ...patch }))}
            saveError={saveError} usernameAvailable={usernameAvailable} isCheckingUsername={isCheckingUsername}
            onUsernameChange={(value) => {
              setDraftProfile(prev => ({ ...prev, username: value.toLowerCase().replace(/\s/g, '') }));
              setUsernameAvailable(null); setSaveError("");
            }}
            onUsernameBlur={async (e) => {
              const currentUsername = e.target.value.toLowerCase().replace(/\s/g, '');
              if (currentUsername === originalUsername) { setUsernameAvailable(true); return; }
              if (currentUsername.length > 1) {
                setIsCheckingUsername(true);
                try { setUsernameAvailable(await isUsernameAvailable(currentUsername)); }
                catch (err) { setUsernameAvailable(null); }
                finally { setIsCheckingUsername(false); }
              }
            }}
            onClose={() => setIsEditing(false)} onSave={handleSaveProfile} pfpUrl={pfpUrl} isUploading={isUploading} cropType={cropType}
            onAvatarClick={() => setIsAvatarMenuOpen(true)} fileInputRef={fileInputRef} onFileChange={(e) => onFileChange(e, 'avatar')}
            onAddWebsite={() => setDraftProfile(prev => prev.websites.length < 4 ? { ...prev, websites: [...prev.websites, ''] } : prev)}
            onRemoveWebsite={(index) => setDraftProfile(prev => {
              const updated = prev.websites.filter((_, i) => i !== index);
              return { ...prev, websites: updated.length ? updated : [''] };
            })}
            onWebsiteChange={(index, value) => setDraftProfile(prev => {
              const updated = [...prev.websites];
              updated[index] = value;
              return { ...prev, websites: updated };
            })}
          />
          <AvatarMenuSheet
            isOpen={isAvatarMenuOpen} drag={avatarDrag} onClose={() => setIsAvatarMenuOpen(false)}
            onChooseFile={() => fileInputRef.current?.click()}
            onRemove={async () => {
              const defaultAvatar = generateDefaultAvatar(profileData.username);
              setPfpUrl(defaultAvatar); setIsAvatarMenuOpen(false);
              await updateAvatarUrl(defaultAvatar);
            }}
          />
          <BannerMenuSheet
            isOpen={isBannerMenuOpen} drag={bannerDrag} onClose={() => setIsBannerMenuOpen(false)}
            onChooseFile={() => bannerInputRef.current?.click()}
            onRemove={async () => {
              const defaultBanner = generateDefaultBanner(profileData.username);
              setBannerUrl(defaultBanner); setIsBannerMenuOpen(false);
              await updateBannerUrl(defaultBanner);
            }}
          />
          <CustomizeSheet
            isOpen={isCustomizeMenuOpen} drag={customizeDrag} bannerUrl={bannerUrl}
            isUploading={isUploading} cropType={cropType} onBannerClick={() => setIsBannerMenuOpen(true)}
            onChooseBannerFile={() => bannerInputRef.current?.click()} bannerInputRef={bannerInputRef}
            onFileChange={(e) => onFileChange(e, 'banner')} profileEffect={profileData.profile_effect}
            onUpdateEffect={async (effect) => {
              setProfileData(prev => ({ ...prev, profile_effect: effect }));
              try { await updateProfileEffect(effect); } catch (err) {}
            }}
            onClose={() => setIsCustomizeMenuOpen(false)}
          />
        </>
      )}

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
          {userPosts.map((post, i) => {
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
                onMenuClick={setPostOptionsMenu}
                onCommentClick={setActiveCommentPostId}
                onLikesClick={setActiveLikesPostId}
              />
            );
          })}
        </div>
      </div>

      <div className="max-w-xl mx-auto min-h-screen flex flex-col relative z-10 overflow-x-hidden">
        <div className="relative">
          <div className="h-36 w-full relative overflow-hidden bg-black flex justify-center items-center">
            <div className="absolute w-full h-full bg-cover bg-center origin-top transition-all duration-700" style={{ backgroundImage: `url(${bannerUrl})` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
            
            {isUploading && cropType === 'banner' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* RESPONSIVE RANK CROWN BADGE */}
            <div className="absolute right-3 sm:right-12 bottom-3 sm:bottom-4 flex flex-col items-center justify-center z-20 group cursor-default" title={`Current Rank: ${currentTier.name}`}>
              <div className="absolute w-20 h-20 sm:w-28 sm:h-28 rounded-full blur-2xl opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" style={{ backgroundColor: currentTier.color }} />
              <div className="relative flex flex-col items-center justify-center w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-gradient-to-b from-black/40 to-black/80 transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105" style={{ boxShadow: `0 10px 40px -10px ${currentTier.color}, inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -4px 20px ${currentTier.color}40` }}>
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl sm:rounded-t-2xl opacity-50 pointer-events-none" />
                <Crown size={28} strokeWidth={2} color={currentTier.color} className="sm:hidden relative z-10 transition-transform duration-500 mb-1" style={{ fill: `${currentTier.color}50`, filter: `drop-shadow(0 0 12px ${currentTier.color})` }} />
                <Crown size={44} strokeWidth={2} color={currentTier.color} className="hidden sm:block relative z-10 transition-transform duration-500 group-hover:scale-110 mb-3 mt-1" style={{ fill: `${currentTier.color}50`, filter: `drop-shadow(0 0 12px ${currentTier.color})` }} />
                <span className="absolute bottom-1.5 sm:bottom-2.5 z-10 text-[8px] sm:text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: '#fff', textShadow: `0 0 10px ${currentTier.color}, 0 0 20px ${currentTier.color}` }}>{currentTier.name}</span>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-4 z-20">
              <PlusSquare
                onClick={() => {
                  setPostContent("");
                  setDraftPostFiles([]);
                  setDraftPostPreviews([]);
                  setIsCreatePostOpen(true);
                }}
                className="w-6 h-6 text-white drop-shadow-md cursor-pointer hover:text-[#4fa8ff] active:scale-90 transition-all duration-300"
              />
              <Settings className="w-6 h-6 text-white drop-shadow-md cursor-pointer hover:rotate-90 active:scale-90 transition-transform duration-500" />
            </div>
          </div>

          <div className="px-4 flex justify-between items-center -mt-10 relative z-10">
            <div className="relative">
              <div className="w-[88px] h-[88px] rounded-full p-1 bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500 cursor-pointer group active:scale-90 transition-transform duration-300" onClick={openEditModal}>
                <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900 relative">
                  <img src={pfpUrl} alt="Avatar" className={`w-full h-full object-cover transition-opacity duration-300 ${isUploading && cropType === 'avatar' ? 'opacity-30' : 'group-hover:opacity-75'}`} />
                  {isUploading && cropType === 'avatar' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-[3px] border-black rounded-full" />
            </div>

            <div className="flex gap-6 text-center mr-4 pt-8">
              <div className="flex flex-col"><span className="font-bold text-lg leading-tight">{userPosts.length}</span><span className="text-xs text-zinc-400">Posts</span></div>
              <div className="flex flex-col"><span className="font-bold text-lg leading-tight">48</span><span className="text-xs text-zinc-400">Teamed</span></div>
              <div className="flex flex-col"><span className="font-bold text-lg leading-tight">2</span><span className="text-xs text-zinc-400">Hubs</span></div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3 space-y-3">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-1">{profileData.name || 'Anonymous User'} <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" /></h1>
            <p className="text-sm text-zinc-400 font-medium">@{profileData.username}</p>
          </div>
          {profileData.bio && <div className="text-[14px] leading-snug space-y-1 whitespace-pre-wrap"><p>{profileData.bio}</p></div>}
          {profileData.websites && profileData.websites.some(url => url.trim() !== '') && (
            <div className="flex flex-wrap gap-2 mt-2">
              {profileData.websites.filter((site) => site.trim() !== '').map((site, i) => {
                  const href = site.startsWith('http') ? site : `https://${site}`;
                  const displayLabel = site.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                  return (
                    <a key={i} href={href} target="_blank" className="flex items-center gap-1.5 text-[12px] text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full hover:bg-blue-500/20 active:scale-95 transition-all">
                      <LinkIcon className="w-3 h-3" /> {displayLabel}
                    </a>
                  );
                })}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={openEditModal} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2 rounded-xl text-sm transition-all active:scale-95 border border-zinc-800">Edit profile</button>
            <button onClick={() => setIsCustomizeMenuOpen(true)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2 rounded-xl text-sm transition-all active:scale-95 border border-zinc-800">Customize</button>
          </div>
        </div>
        
        <RankHUD points={userPoints} />

        <div className="px-2 pt-6">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide px-2 pb-2">
            {trophyHighlights.map((trophy, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 cursor-pointer group shrink-0 w-[64px] active:scale-90 transition-transform">
                <div className={`w-[64px] h-[64px] rounded-full p-[2px] ${trophy.ring}`}>
                  <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                    <img src={trophy.img} alt={trophy.name} className="w-full h-full object-cover" />
                  </div>
                </div>
                <span className="text-[11px] font-medium text-white truncate w-full text-center">{trophy.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-around border-b border-zinc-900 mt-2">
          <button onClick={() => setActiveTab('posts')} className={`flex-1 py-3 flex justify-center transition-colors ${activeTab === 'posts' ? 'border-b-[1px] border-white text-white' : 'text-zinc-500'}`}><Grid className="w-6 h-6" /></button>
          <button onClick={() => setActiveTab('sandbox')} className={`flex-1 py-3 flex justify-center transition-colors ${activeTab === 'sandbox' ? 'border-b-[1px] border-white text-white' : 'text-zinc-500'}`}><FolderGit2 className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 w-full min-h-[300px] bg-black">
          {activeTab === 'posts' && (
            <div className="pt-0.5 pb-20 bg-black">
              {isPostsFetching ? (
                <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>
              ) : userPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
                  <Grid className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No beacons dropped yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-[2px]">
                  {userPosts.map((post, index) => {
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
          {activeTab === 'sandbox' && (
            <div className="p-1 space-y-1">
              <div className="bg-zinc-900/50 p-4 flex justify-between items-center group cursor-pointer hover:bg-zinc-900 active:scale-[0.98] transition-all rounded-lg">
                <div>
                  <h4 className="font-bold text-white text-sm group-hover:text-[#4fa8ff] transition-colors">Talk to Me</h4>
                  <p className="text-xs text-zinc-400 mt-1">UE5 Psychological Horror Game</p>
                </div>
                <Cpu className="w-5 h-5 text-zinc-500 group-hover:text-[#4fa8ff] transition-colors" />
              </div>
            </div>
          )}
        </div>

        </div> 

      {/* === Action Sheets Mounted at Root Level === */}
      <CommentSheet 
        isOpen={!!activeCommentPostId} 
        drag={commentDrag} 
        onClose={() => setActiveCommentPostId(null)} 
        postId={activeCommentPostId} 
        currentUserAvatar={pfpUrl} 
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