"use client";
import { useState, useEffect } from "react";

export default function LiveTimer({ createdAt }: { createdAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const expiresAt = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;

    const calculateTime = () => {
      const diff = expiresAt - new Date().getTime();
      if (diff <= 0) return "EXPIRED";
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => setTimeLeft(calculateTime()), 1000);
    
    return () => clearInterval(interval);
  }, [createdAt]);

  if (!timeLeft) return <span className="font-mono text-zinc-500">--h --m --s</span>;

  return (
    <span className={`font-mono text-sm font-bold ${timeLeft === "EXPIRED" ? "text-red-500" : "text-[#4fa8ff]"}`}>
      {timeLeft}
    </span>
  );
}