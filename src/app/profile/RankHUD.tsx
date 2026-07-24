import React, { memo } from 'react';
import { RANK_TIERS } from './helpers';

export default memo(function RankHUD({ points = [2510, 2580, 2540, 2650, 2720, 2690, 2780, 2847] }: { points?: number[] }) {
  const currentMmr = points[points.length - 1];
  const prevMmr = points.length > 1 ? points[points.length - 2] : currentMmr;
  const delta = currentMmr - prevMmr;
  const rankIndex = RANK_TIERS.reduce((acc, tier, idx) => (currentMmr >= tier.minMmr ? idx : acc), 0);
  const tier = RANK_TIERS[rankIndex];
  const isMax = rankIndex === RANK_TIERS.length - 1;
  const nextTier = isMax ? null : RANK_TIERS[rankIndex + 1];
  const tierMin = tier.minMmr;
  const tierMax = isMax ? currentMmr : (nextTier?.minMmr ?? currentMmr);
  const progressPercent = isMax ? 100 : Math.min(100, Math.max(0, ((currentMmr - tierMin) / (tierMax - tierMin)) * 100));
  const mmrToNext = isMax ? 0 : tierMax - currentMmr;

  return (
    <div className="px-4 pt-5 pb-2 mt-2 border-t border-zinc-900/80 relative z-10">
      <div className="flex justify-between items-end mb-3">
        <div>
          <p className="text-[11px] text-zinc-500 font-mono tracking-widest uppercase mb-1">System Rating</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black font-mono tabular-nums leading-none tracking-tight"
                style={isMax ? { backgroundImage: `linear-gradient(90deg, ${tier.color}, #f97316)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } : { color: tier.color }}>
              {currentMmr.toLocaleString()}
            </p>
            <span className={`text-xs font-mono font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {delta >= 0 ? '+' : ''}{delta}
            </span>
          </div>
        </div>
        {!isMax && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-1">Next Tier</p>
            <p className="text-sm font-bold tracking-wide" style={{ color: nextTier?.color }}>{nextTier?.name}</p>
          </div>
        )}
      </div>
      <div className="relative w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%`, backgroundColor: tier.color, boxShadow: `0 0 10px ${tier.color}80` }} />
        <div className="absolute inset-0 flex justify-between px-1 opacity-20 pointer-events-none">
          {[...Array(10)].map((_, i) => <div key={i} className="w-[1px] h-full bg-white" />)}
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-[11px] font-mono text-zinc-400">
          <span style={{ color: tier.color }} className="font-semibold">{tier.name}</span> STATUS ACTIVE
        </p>
        {!isMax && (
          <p className="text-[11px] font-mono text-zinc-400"><span className="text-white font-medium">{mmrToNext}</span> MMR TO UPGRADE</p>
        )}
      </div>
    </div>
  );
});