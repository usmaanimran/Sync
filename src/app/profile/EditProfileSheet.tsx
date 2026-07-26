import React, { memo } from 'react';
import { X, Camera } from 'lucide-react';
import { DragHandlers, ProfileDraft } from './types';

export default memo(function EditProfileSheet({
  isOpen, drag, draftProfile, onDraftChange, saveError, usernameAvailable, isCheckingUsername,
  onUsernameChange, onUsernameBlur, onClose, onSave, pfpUrl, isUploading, cropType,
  onAvatarClick, fileInputRef, onFileChange, onAddWebsite, onRemoveWebsite, onWebsiteChange,
}: {
  isOpen: boolean;
  drag: DragHandlers;
  draftProfile: ProfileDraft;
  onDraftChange: (patch: Partial<ProfileDraft>) => void;
  saveError: string;
  usernameAvailable: boolean | null;
  isCheckingUsername: boolean;
  onUsernameChange: (value: string) => void;
  onUsernameBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSave: () => void;
  pfpUrl: string;
  isUploading: boolean;
  cropType: 'avatar' | 'banner' | 'post';
  onAvatarClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddWebsite: () => void;
  onRemoveWebsite: (idx: number) => void;
  onWebsiteChange: (idx: number, value: string) => void;
}) {
  return (
    <div className={`fixed inset-0 z-[60] flex flex-col justify-end overflow-hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
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
            <h2 className="font-bold text-base tracking-tight select-none pointer-events-none text-white">Edit Profile</h2>
            <button
  onClick={onSave}
  disabled={!draftProfile.name.trim() || !draftProfile.username.trim() || usernameAvailable === false}
  className={`text-sm transition-all px-1 ${
    !draftProfile.name.trim() || !draftProfile.username.trim() || usernameAvailable === false
      ? 'text-zinc-600 cursor-not-allowed'
      : 'text-[#4fa8ff] font-semibold active:scale-95'
  }`}
>
  Done
</button>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' } as React.CSSProperties}
        >
        <div className="flex flex-col items-center py-8 relative z-10">
          <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border-2 border-zinc-700/80 shadow-[0_0_25px_rgba(0,0,0,0.5)] relative group cursor-pointer active:scale-95 transition-transform" onClick={onAvatarClick}>
            <img src={pfpUrl} alt="Avatar" className={`w-full h-full object-cover transition-opacity duration-300 ${isUploading && cropType === 'avatar' ? 'opacity-30' : 'group-hover:opacity-70'}`} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            {isUploading && cropType === 'avatar' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button onClick={onAvatarClick} className="px-5 py-2 rounded-full bg-zinc-800/50 text-[#4fa8ff] font-semibold text-sm hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-700/50 shadow-sm">
            Edit picture
          </button>
          <input type="file" ref={fileInputRef} accept="image/*" onChange={onFileChange} className="hidden" />
        </div>

        <div className="px-5 py-2 space-y-4 relative z-10">
          {saveError && (
            <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg mb-2">
              {saveError}
            </div>
          )}
          <div className="relative group">
  <label className="absolute left-4 top-2 text-[11px] font-medium text-slate-400 group-focus-within:text-[#4fa8ff] transition-colors z-10">Name</label>
  <span className="absolute right-4 top-2 text-[10px] font-medium text-slate-500 group-focus-within:text-[#4fa8ff] transition-colors z-10">
    {50 - (draftProfile.name?.length || 0)}
  </span>
  <input 
    type="text" 
    maxLength={50}
    value={draftProfile.name} 
    onChange={(e) => onDraftChange({ name: e.target.value })} 
    className="w-full rounded-xl border border-slate-700/50 bg-[#1a2229]/80 px-4 pb-2 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 focus:bg-[#1e2730] focus:border-[#4fa8ff]/60 focus:shadow-[0_0_20px_rgba(79,168,255,0.15)]" 
    placeholder="Your name" 
  />
</div>
          
          <div className="relative group">
  <label className="absolute left-4 top-2 text-[11px] font-medium text-slate-400 group-focus-within:text-[#4fa8ff] transition-colors z-10">Username</label>
  <span className="absolute right-10 top-2 text-[10px] font-medium text-slate-500 group-focus-within:text-[#4fa8ff] transition-colors z-10">
  {20 - (draftProfile.username?.length || 0)}
</span>
  <input
    type="text"
    maxLength={20}
    value={draftProfile.username}
    onChange={(e) => onUsernameChange(e.target.value)}
    onBlur={onUsernameBlur}
    className={`w-full rounded-xl border bg-[#1a2229]/80 px-4 pb-2 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 focus:bg-[#1e2730] pr-10 ${
      usernameAvailable === false ? "border-red-500/80 focus:border-red-500/80" : "border-slate-700/50 focus:border-[#4fa8ff]/60"
    }`}
    placeholder="Username"
  />
  <div className="absolute right-4 top-4 z-20 flex items-center justify-center">
    {isCheckingUsername ? (
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-slate-200" />
    ) : usernameAvailable === true ? (
      <svg className="h-5 w-5 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-slide-up" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
    ) : usernameAvailable === false ? (
      <svg className="h-5 w-5 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)] animate-slide-up" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
    ) : null}
  </div>
</div>

          <div className="relative group">
  <label className="absolute left-4 top-2 text-[11px] font-medium text-slate-400 group-focus-within:text-[#4fa8ff] transition-colors z-10">Bio</label>
  <span className="absolute right-4 top-2 text-[10px] font-medium text-slate-500 group-focus-within:text-[#4fa8ff] transition-colors z-10">
    {160 - (draftProfile.bio?.length || 0)}
  </span>
  <textarea 
    maxLength={160}
    value={draftProfile.bio} 
    onChange={(e) => onDraftChange({ bio: e.target.value })} 
    className="w-full rounded-xl border border-slate-700/50 bg-[#1a2229]/80 px-4 pb-4 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 focus:bg-[#1e2730] focus:border-[#4fa8ff]/60 focus:shadow-[0_0_20px_rgba(79,168,255,0.15)] resize-none h-28 leading-relaxed" 
    placeholder="Write something about yourself..." 
  />
</div>

          <div className="relative group bg-[#1a2229]/80 rounded-xl p-4 border border-slate-700/50 space-y-3 transition-all duration-300 focus-within:border-[#4fa8ff]/60 focus-within:shadow-[0_0_20px_rgba(79,168,255,0.15)]">
            <label className="text-[11px] font-medium text-slate-400 group-focus-within:text-[#4fa8ff] transition-colors">
              Websites & Links
            </label>
            {draftProfile.websites.map((url, idx) => (
              <div key={idx} className="flex gap-2 items-center animate-slide-up">
               <input
  type="text"
  maxLength={100}
  value={url}
  onChange={(e) => onWebsiteChange(idx, e.target.value)}
  className="w-full rounded-lg bg-[#1e2730] px-3 py-2 text-sm text-[#4fa8ff] outline-none transition-all placeholder-slate-500"
  placeholder={idx === 0 ? "https://github.com/..." : "https://..."}
/>
                {draftProfile.websites.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveWebsite(idx)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors active:scale-95"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {draftProfile.websites.length < 4 && (
              <button
                type="button"
                onClick={onAddWebsite}
                className="text-[11px] text-[#4fa8ff] font-semibold hover:underline"
              >
                + Add another link
              </button>
            )}
          </div>

        </div>
        </div>
      </div>
    </div>
  );
});