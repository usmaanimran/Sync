'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ProfileEffectProps {
  effectType: string;
}

export default function ProfileEffect({ effectType }: ProfileEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isIntense, setIsIntense] = useState(true);

  // Manage transition from high-intensity load state to ambient background
  useEffect(() => {
    setIsIntense(true);
    const timer = setTimeout(() => {
      setIsIntense(false);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [effectType]);

  // Initialize and animate Canvas API context for matrix effect
  useEffect(() => {
    if (effectType !== 'matrix' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      // Apply progressive alpha masking for trailing motion blur
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#0F0'; 
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [effectType]);

  if (effectType === 'none' || !effectType) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ease-in-out
      ${isIntense ? 'opacity-100' : 'opacity-15'}`}
      style={{ 
        mixBlendMode: 'screen',
        WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)',
        maskImage: 'linear-gradient(to bottom, black 50%, transparent 95%)'
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover opacity-60"
      />
      {/* Gradient overlay relies entirely on CSS masking for optimal compositing */}
    </div>
  );
}