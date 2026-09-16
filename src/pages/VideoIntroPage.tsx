import React, { useRef, useEffect } from 'react';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';

interface VideoIntroPageProps {
  onEnter: () => void;
}

export const VideoIntroPage: React.FC<VideoIntroPageProps> = ({ onEnter }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Ensure autoplay works smoothly and respect user reduced motion preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches && videoRef.current) {
        videoRef.current.pause();
      } else if (videoRef.current) {
        videoRef.current.play().catch(() => {
          // Autoplay may be restricted in some browsers until user interacts
        });
      }
    }
  }, []);

  return (
    <div
      id="video-intro-page"
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-stone-950 text-white flex flex-col justify-between p-6 sm:p-10 md:p-14 z-50 select-none"
    >
      {/* Full Viewport Background Cooking Video */}
      <video
        ref={videoRef}
        src="/videos/hero-cooking.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />

      {/* Dark Translucent Overlay for Readability */}
      <div className="absolute inset-0 bg-stone-950/70 sm:bg-stone-950/60 backdrop-blur-[1px] pointer-events-none z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-stone-950/70 pointer-events-none z-10" />

      {/* Top Bar: ChefFork Logo */}
      <header className="relative z-20 flex items-center justify-between">
        <div id="video-intro-brand-logo" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-1 ring-white/20">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-2xl tracking-tight leading-none text-white drop-shadow-sm">
              Chef<span className="text-orange-500">Fork</span>
            </span>
            <span className="text-[11px] font-semibold text-stone-300 tracking-wider uppercase drop-shadow-xs">
              Social Cooking Platform
            </span>
          </div>
        </div>
      </header>

      {/* Center Hero: Welcome & Core Value Callout */}
      <main className="relative z-20 max-w-2xl my-auto py-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/25 border border-orange-400/40 text-orange-300 text-xs font-semibold mb-6 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span>The Open Kitchen for Home Chefs</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-md">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">ChefFork</span>
        </h1>

        <p className="mt-5 text-lg sm:text-xl text-stone-200 leading-relaxed font-medium drop-shadow-sm max-w-xl">
          Share great food. Fork any recipe to make it yours.
        </p>

        {/* Enter ChefFork CTA Button */}
        <div className="mt-8 pt-2">
          <button
            type="button"
            id="video-intro-enter-btn"
            onClick={onEnter}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg shadow-2xl shadow-orange-600/50 hover:shadow-orange-500/60 border border-orange-400/30 transition-all transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
          >
            <span>Enter ChefFork</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </main>

      {/* Footer info note */}
      <footer className="relative z-20 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400 border-t border-white/10 pt-4">
        <span>Connect, cook, and explore recipe lineage</span>
        <span>© {new Date().getFullYear()} ChefFork</span>
      </footer>
    </div>
  );
};
