import { Gift, Heart, Sparkles } from 'lucide-react';

type GiftLoungeBackdropProps = {
  variant?: 'card' | 'modal' | 'subtle';
  className?: string;
};

/** Decorative gift-box / sparkle background for Gifting Lounge surfaces */
export default function GiftLoungeBackdrop({ variant = 'card', className = '' }: GiftLoungeBackdropProps) {
  const rounded = variant === 'modal' ? 'rounded-3xl' : 'rounded-2xl';
  const iconOpacity = variant === 'subtle' ? 'opacity-[0.07]' : 'opacity-[0.14]';
  const patternOpacity = variant === 'subtle' ? 'opacity-60' : 'opacity-100';

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${rounded} ${className}`}
      aria-hidden
    >
      <div className={`absolute inset-0 gift-lounge-pattern ${patternOpacity}`} />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 95% 8%, rgba(168, 85, 247, 0.12), transparent 58%), radial-gradient(ellipse 45% 40% at 5% 95%, rgba(233, 30, 99, 0.07), transparent 52%)',
        }}
      />

      {/* Large sparkle — top right (reference layout) */}
      <Sparkles
        className={`absolute -top-2 -right-2 w-36 h-36 sm:w-44 sm:h-44 text-violet-300 ${iconOpacity} rotate-[8deg]`}
        strokeWidth={1.2}
      />

      {variant !== 'subtle' && (
        <>
          <Sparkles className={`absolute top-10 right-20 w-5 h-5 text-pink-300 ${iconOpacity}`} />
          <Sparkles className={`absolute top-28 right-10 w-4 h-4 text-violet-400 ${iconOpacity}`} />
          <Gift className={`absolute bottom-20 right-6 w-14 h-14 text-violet-200 ${iconOpacity} -rotate-12`} strokeWidth={1.25} />
          <Gift className={`absolute top-1/2 -left-3 w-12 h-12 text-pink-200 ${iconOpacity} rotate-[18deg]`} strokeWidth={1.25} />
          <Heart className={`absolute bottom-8 left-8 w-8 h-8 text-pink-200 ${iconOpacity} rotate-[-8deg]`} strokeWidth={1.5} />
        </>
      )}
    </div>
  );
}
