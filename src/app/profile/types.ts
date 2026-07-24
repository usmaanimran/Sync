import React from 'react';

export type DragHandlers = {
  sheetRef: React.RefObject<HTMLDivElement | null>;
  backdropRef: React.RefObject<HTMLDivElement | null>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  sheetStyle: React.CSSProperties;
  backdropStyle: React.CSSProperties;
};

export type ProfileDraft = {
  name: string;
  username: string;
  bio: string;
  websites: string[];
  profile_effect: string;
};