import React, { memo } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { timeAgo } from './helpers';

/* Helper to parse the JSON array of images */
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

export default memo(function PeekPostModal({
  post, isVisible, pfpUrl }: { 
   post: any; isVisible: boolean; pfpUrl: string; // <-- Added pfpUrl prop
}) {
  if (!post && !isVisible) return null;

  const images = parsePostImages(post);
  const displayImage = images.length > 0 ? images[0] : null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-0 pointer-events-none transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/80" />
      
      <div className={`relative w-full max-w-[420px] bg-[#0a0d10] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
                 
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/80 bg-[#0a0d10] z-10 shrink-0">
          <div className="flex items-center">
            {/* Added the fallback right here 👇 */}
            <img src={post?.users?.avatar_url || pfpUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-zinc-800" />
            
          
            <div className="ml-3">
              <div className="flex items-center gap-1">
                <h4 className="font-bold text-sm text-white">{post?.users?.full_name}</h4>
                <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-500/20" />
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">@{post?.users?.username} • {post ? timeAgo(post.created_at) : ''}</p>
            </div>
          </div>
          <button className="p-1.5 rounded-full text-zinc-400 opacity-0 pointer-events-none">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 bg-[#0a0d10]">
          {post?.content && (
            <div className="px-4 py-3 text-[14px] text-slate-200 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          )}
          
          {displayImage && (
            <div className="w-full bg-zinc-950 flex items-center justify-center relative">
              <img src={displayImage} alt="Post" className="w-full h-auto object-cover max-h-[650px]" />
              {/* Little badge to show if there are more images! */}
              {images.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold backdrop-blur-md">
                  1 / {images.length}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
});