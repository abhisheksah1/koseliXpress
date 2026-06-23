import React, { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Review } from '../../types';

interface ReviewsSliderProps {
  reviews: Review[];
  isLight: boolean;
  primaryTheme?: string;
  secondaryTheme?: string;
  cardBgTheme?: string;
}

export default function ReviewsSlider({
  reviews,
  isLight,
  primaryTheme = 'var(--primary-theme)',
  secondaryTheme = 'var(--secondary-theme)',
  cardBgTheme = 'var(--theme-bg-card)'
}: ReviewsSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Determine items per view based on responsive layout
  const [itemsPerView, setItemsPerView] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter published reviews
  const activeReviews = reviews.filter(r => r.status === 'published');
  const totalReviews = activeReviews.length;

  // Autoplay functionality - slides to the left
  useEffect(() => {
    if (totalReviews <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        // If showing a single item, we standard wrap
        // Otherwise, wrap depending on the visible items
        const maxIndex = Math.max(0, totalReviews - itemsPerView);
        if (prev >= maxIndex) {
          return 0; // wrap back to start
        }
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [totalReviews, isHovered, itemsPerView]);

  if (totalReviews === 0) return null;

  const maxIndex = Math.max(0, totalReviews - itemsPerView);
  const safeActiveIndex = Math.min(activeIndex, maxIndex);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  // Touch Swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    const threshold = 50;

    if (diff > threshold) {
      // Swiped left -> move right (next)
      handleNext();
      touchStartX.current = null;
    } else if (diff < -threshold) {
      // Swiped right -> move left (prev)
      handlePrev();
      touchStartX.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = null;
  };

  return (
    <div 
      className="relative w-full overflow-hidden py-4 px-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      id="customer-reviews-auto-slider"
    >
      {/* Outer Slider Deck */}
      <div className="relative w-full overflow-hidden">
        <motion.div 
          className="flex gap-6 w-full"
          animate={{ x: `calc(-${safeActiveIndex * (100 / itemsPerView)}% - ${safeActiveIndex * (1.5 / itemsPerView)}rem)` }}
          transition={{ type: 'spring', stiffness: 180, damping: 25 }}
        >
          {activeReviews.map((rev, revIdx) => (
            <div 
              key={`review-card-${rev.id || revIdx}`}
              className={`shrink-0 p-6 rounded-2xl flex flex-col justify-between space-y-4 text-left border shadow-2xs transition-all duration-300 ${
                itemsPerView === 1 ? 'w-full' : itemsPerView === 2 ? 'w-[calc(50%-12px)]' : 'w-[calc(33.3333%-16px)]'
              } ${
                isLight 
                  ? 'bg-white border-rose-100 hover:border-rose-350 hover:shadow-sm' 
                  : 'bg-[#0d0d0d] border-white/5 hover:border-amber-500/15'
              }`}
              style={{ backgroundColor: isLight ? cardBgTheme : undefined }}
            >
              <div className="space-y-3">
                {/* Visual quote accent mark */}
                <div className="flex justify-between items-center">
                  <span className={isLight ? 'text-rose-100' : 'text-white/5'}>
                    <Quote className="w-8 h-8 fill-current rotate-180" />
                  </span>
                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5" style={{ color: isLight ? primaryTheme : '#f59e0b' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={`star-${s}`} className="w-3 h-3 fill-current text-current" />
                    ))}
                  </div>
                </div>

                <p className={`text-xs sm:text-sm italic font-serif leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-350'}`}>
                  "{rev.comment}"
                </p>
              </div>

              {/* Author badge footer */}
              <div className="flex items-center gap-3 pt-3 border-t border-dashed border-slate-100 dark:border-white/5">
                <div 
                  className={`w-9 h-9 font-serif font-black text-xs rounded-full flex items-center justify-center uppercase border shrink-0 ${
                    isLight 
                      ? 'bg-rose-50 border-rose-200' 
                      : 'bg-amber-500/15 border-amber-500/25'
                  }`}
                  style={{ color: isLight ? primaryTheme : '#f59e0b' }}
                >
                  {rev.customerName.charAt(0)}
                </div>
                <div>
                  <h5 className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {rev.customerName}
                  </h5>
                  <span className={`text-[9.5px] uppercase font-bold font-mono tracking-wider block mt-0.5 ${
                    isLight ? 'text-rose-600/75' : 'text-amber-500/80'
                  }`} style={{ color: isLight ? secondaryTheme : undefined }}>
                    Verified Giver
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Control Dots & Arrow Buttons */}
      {totalReviews > itemsPerView && (
        <div className="flex items-center justify-between mt-6 px-2">
          {/* Slider Indicators */}
          <div className="flex gap-1.5">
            {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => (
              <button
                key={`slider-dot-${dotIdx}`}
                onClick={() => setActiveIndex(dotIdx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  safeActiveIndex === dotIdx 
                    ? 'w-6' 
                    : 'w-2 opacity-40 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: safeActiveIndex === dotIdx 
                    ? (isLight ? primaryTheme : '#f59e0b') 
                    : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)') 
                }}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>

          {/* Previous/Next Manual Navigation Controls */}
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isLight 
                  ? 'bg-white border-rose-100 hover:bg-rose-50 text-slate-700 hover:text-slate-900 shadow-2xs' 
                  : 'bg-[#0a0a0a] border-white/5 hover:bg-white/5 text-slate-300 hover:text-white'
              }`}
              aria-label="Previous review"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                isLight 
                  ? 'bg-white border-rose-100 hover:bg-rose-50 text-slate-700 hover:text-slate-900 shadow-2xs' 
                  : 'bg-[#0a0a0a] border-white/5 hover:bg-white/5 text-slate-300 hover:text-white'
              }`}
              aria-label="Next review"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
