export const timeAgo = (date: string | Date) => {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
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

export const RANK_TIERS = [
  { name: 'NULL',    color: '#9ca3af', minMmr: 0 },
  { name: 'INIT',    color: '#4ade80', minMmr: 1000 },
  { name: 'COMPILE', color: '#22d3ee', minMmr: 1500 },
  { name: 'RUNTIME', color: '#60a5fa', minMmr: 2000 },
  { name: 'KERNEL',  color: '#a78bfa', minMmr: 2500 },
  { name: 'ROOT',    color: '#f87171', minMmr: 3000 },
];

export const generateDefaultAvatar = (seed: string) => {
  return `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${seed || 'Nexus'}&backgroundColor=ffffff`;
};

export const DISCORD_VIBE_BANNERS = [
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
];

export const generateDefaultBanner = (seed: string) => {
  if (!seed) return DISCORD_VIBE_BANNERS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DISCORD_VIBE_BANNERS.length;
  return DISCORD_VIBE_BANNERS[index];
};

export const formatCount = (count: number) => {
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(count);
};