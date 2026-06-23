import React, { useState } from 'react';
import { DatabaseState, CustomPageSection, Product, Category, CurrencySettings } from '../../types';
import ProductCard from './ProductCard';
import DeliveryCountdown from './DeliveryCountdown';
import ReviewsSlider from './ReviewsSlider';
import Footer from './Footer';
import { Star, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';

interface PageRendererProps {
  sections: CustomPageSection[];
  state: DatabaseState;
  selectedCurrency: CurrencySettings;
  onViewProductDetails: (productId: string) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  onNavigateToCategory: (catId: string) => void;
}

export default function PageRenderer({
  sections,
  state,
  selectedCurrency,
  onViewProductDetails,
  onAddToCart,
  onNavigateToCategory
}: PageRendererProps) {
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const isLight = state.appearance?.themeMode !== 'dark';

  return (
    <div className="space-y-12 pb-16 font-sans">
      {sections.map((section, sectionIdx) => {
        const { id, type, data } = section;
        const secKey = id || `sec-${type}-${sectionIdx}`;

        switch (type) {
          
          /* SECTION: HERO BANNER COVERS */
          case 'banner':
            return (
              <section key={secKey} className={`relative rounded-3xl overflow-hidden py-24 sm:py-32 px-6 sm:px-12 flex items-center justify-center text-center border shadow-md ${
                isLight ? 'bg-[#FCF7F7] border-rose-100/80 shadow-rose-100/5' : 'bg-black border-white/5 shadow-2x'
              }`}>
                <div className="absolute inset-0">
                  <img src={data.imageUrl || 'https://images.unsplash.com/photo-154946?q=80&w=1200&auto=format&fit=crop'} className={`w-full h-full object-cover ${isLight ? 'opacity-25' : 'opacity-60'}`} alt={data.title ? `${data.title} - Gift Hampers Kathmandu, Nepal` : "Artisan Celebrating Gifting Nepal"} referrerPolicy="no-referrer" />
                  <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-t from-white/95 via-white/80 to-white/50' : 'bg-gradient-to-t from-black/90 via-black/50 to-black/30'}`} />
                </div>
                <div className="relative max-w-xl mx-auto space-y-4">
                  <div className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-wider ${
                    isLight 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/60' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: isLight ? 'var(--primary-theme)' : undefined }} /> Artisan Gifting Experience
                  </div>
                  <h1 className={`text-3xl sm:text-5xl font-serif italic leading-tight tracking-wide ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>
                    {data.title}
                  </h1>
                  <p className={`text-sm sm:text-base max-w-md mx-auto leading-relaxed font-medium ${
                    isLight ? 'text-slate-650' : 'text-slate-100 font-medium'
                  }`}>
                    {data.subtitle}
                  </p>
                  {data.buttonText && (
                    <div className="pt-2">
                      <a
                        href={data.buttonUrl || '#'}
                        className={`inline-block px-7 py-3.5 text-xs font-black tracking-widest rounded-xl shadow-lg transition ${
                          isLight 
                            ? 'bg-rose-600 text-white hover:bg-rose-700' 
                            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950'
                        }`}
                        style={{ backgroundColor: isLight ? 'var(--primary-theme)' : undefined }}
                      >
                        {data.buttonText.toUpperCase()}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            );

          /* SECTION: IMAGE CAROUSEL SLIDER */
          case 'slider':
            const slides = data.images || [];
            if (slides.length === 0) return null;
            return (
              <section key={secKey} className={`relative rounded-3xl overflow-hidden aspect-[21/9] border group shadow-sm ${
                isLight ? 'bg-white border-rose-100/60' : 'bg-[#0d0d0d] border-white/5'
              }`}>
                <img 
                  src={slides[activeSlideIndex] || 'https://images.unsplash.com/photo-154946?q=80&w=1200&auto=format&fit=crop'} 
                  className="w-full h-full object-cover transition-all duration-700 opacity-100" 
                  alt={`Curated Gift Collection Slideshow frame ${activeSlideIndex + 1} - Koseli Express Nepal`} 
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual shade overlays */}
                <div className={`absolute inset-0 ${isLight ? 'bg-black/10' : 'bg-black/40'}`} />

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                  {slides.map((_, dotIdx) => (
                    <button
                      key={`slide-dot-${dotIdx}`}
                      onClick={() => setActiveSlideIndex(dotIdx)}
                      className={`w-2.5 h-2.5 rounded-full transition ${activeSlideIndex === dotIdx ? 'bg-amber-500 scale-110' : 'bg-white/40 hover:bg-white'}`}
                      style={{ backgroundColor: isLight && activeSlideIndex === dotIdx ? 'var(--primary-theme)' : undefined }}
                    />
                  ))}
                </div>

                {/* Left Right arrows */}
                <button
                  onClick={() => setActiveSlideIndex(activeSlideIndex === 0 ? slides.length - 1 : activeSlideIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 hidden group-hover:block"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActiveSlideIndex(activeSlideIndex === slides.length - 1 ? 0 : activeSlideIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/90 hidden group-hover:block"
                >
                  ›
                </button>
              </section>
            );

          /* SECTION: CATEGORIES GRID ACCENT */
          case 'categories_grid': {
            // 1. Gather all active categories
            let targetCategories = [...state.categories];

            // 2. Filter by explicitly selected categories if defined
            const chosenIds = data.selectedCategoryIds || [];
            if (chosenIds.length > 0) {
              targetCategories = targetCategories.filter(c => chosenIds.includes(c.id));
            }

            // 3. Optional Filter: Hide Empty Categories
            if (data.hideEmpty) {
              targetCategories = targetCategories.filter(c => {
                const count = state.products.filter(p => p.categoryId === c.id && p.status !== 'deleted').length;
                return count > 0;
              });
            }

            // 4. Sort according to criteria
            const activeSort = data.sortBy || 'custom';
            if (activeSort === 'name') {
              targetCategories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } else if (activeSort === 'product_count') {
              const getCount = (cId: string) => state.products.filter(p => p.categoryId === cId && p.status !== 'deleted').length;
              targetCategories.sort((a, b) => getCount(b.id) - getCount(a.id));
            } else if (activeSort === 'latest') {
              targetCategories.sort((a, b) => {
                const idA = parseInt(a.id.replace(/\D/g, '')) || 0;
                const idB = parseInt(b.id.replace(/\D/g, '')) || 0;
                return idB - idA; // Newer/higher numeric IDs first
              });
            } else {
              // 'custom' order
              targetCategories.sort((a, b) => (a.navbarSeq || 0) - (b.navbarSeq || 0));
            }

            // 5. Slice to limitCount
            const maxLimit = data.limitCount || 20;
            targetCategories = targetCategories.slice(0, maxLimit);

            return (
              <section key={secKey} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className={`text-2xl font-serif italic tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>
                    {data.title || 'Curated Gifting Occasions'}
                  </h2>
                  <p className={`text-xs font-mono tracking-widest uppercase ${isLight ? 'text-rose-700 font-bold' : 'text-amber-500/80'}`} style={{ color: isLight ? 'var(--secondary-theme)' : undefined }}>
                    {data.subtitle || 'Lovingly crafted gift sets for every celebration'}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {targetCategories.map((cat, catIdx) => {
                    const prodCount = state.products.filter(p => p.categoryId === cat.id && p.status !== 'deleted').length;
                    return (
                      <div
                        key={`cat-grid-item-${cat.id || catIdx}`}
                        onClick={() => onNavigateToCategory(cat.id)}
                        className={`group relative h-48 rounded-2xl overflow-hidden border cursor-pointer transition ${
                          isLight ? 'bg-white border-rose-100 hover:border-rose-300' : 'bg-[#0a0a0a] border-white/5 hover:border-amber-500/30'
                        }`}
                      >
                        <img src={cat.image || 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-100" alt={`${cat.name} Collection item - Premium Gifting Nepal`} referrerPolicy="no-referrer" />
                        <div className={`absolute inset-0 ${isLight ? 'bg-black/10 group-hover:bg-black/25' : 'bg-black/40 group-hover:bg-black/60'} transition-colors`} />
                        <div className="absolute inset-x-4 bottom-4 text-left">
                          <h4 className="font-serif italic text-white text-sm sm:text-base leading-tight font-medium truncate drop-shadow-sm">{cat.name}</h4>
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-[10px] font-mono tracking-wider font-bold text-white drop-shadow-sm`}>Explore →</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${isLight ? 'text-slate-705 bg-white/95 font-black shadow-xs' : 'text-slate-350 bg-black/40'}`}>{prodCount} products</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {targetCategories.length === 0 && (
                    <div className={`col-span-full py-12 text-center text-xs italic rounded-2xl border ${
                      isLight ? 'text-slate-500 bg-white border-rose-100' : 'text-slate-400 bg-[#0a0a0a] border-white/5'
                    }`}>
                      No matching categories met the display criteria.
                    </div>
                  )}
                </div>
              </section>
            );
          }

          /* SECTION: DYNAMIC PRODUCTS SELECTION SHOWCASE GRID */
          case 'products_grid':
            const prodIds = data.productIds || [];
            const targetedProducts = state.products.filter(p => prodIds.includes(p.id) && p.status !== 'deleted');
            
            if (targetedProducts.length === 0) return null;

            return (
              <section key={secKey} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className={`text-2xl font-serif italic tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>
                    {data.title || 'Weekly Recommended Selections'}
                  </h2>
                  <p className={`text-xs font-mono tracking-widest uppercase ${isLight ? 'text-rose-700 font-bold' : 'text-amber-500/85'}`} style={{ color: isLight ? 'var(--secondary-theme)' : undefined }}>
                    {data.subtitle || 'Specially selected by Koseli artisans for perfect gifting'}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {targetedProducts.map((prod, prodIdx) => (
                    <ProductCard
                      key={`prod-grid-${prod.id || prodIdx}`}
                      product={prod}
                      selectedCurrency={selectedCurrency}
                      onViewDetails={onViewProductDetails}
                      onAddToCart={onAddToCart}
                      allProducts={state.products}
                    />
                  ))}
                </div>
              </section>
            );

          /* SECTION: IMAGE WITH SIDE CONTENT */
          case 'image_content': {
            const layout = data.layoutPreset || 'left';
            const btnLabel = data.buttonLabel;
            const btnUrl = data.buttonPath || '#';
            const btnStyle = data.buttonStyle || 'amber';

            // Determine button style classes
            let btnClasses = "inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider transition uppercase ";
            if (isLight) {
              if (btnStyle === 'violet') {
                btnClasses += "bg-rose-700 text-white hover:bg-rose-800 shadow-sm";
              } else if (btnStyle === 'ghost') {
                btnClasses += "bg-transparent border border-rose-200 hover:border-rose-400 text-rose-700 hover:bg-rose-50/50";
              } else {
                btnClasses += "bg-rose-600 hover:bg-rose-700 text-white shadow-sm";
              }
            } else {
              if (btnStyle === 'violet') {
                btnClasses += "bg-[#492583] hover:bg-[#6232b1] text-white shadow-md shadow-purple-950/20";
              } else if (btnStyle === 'ghost') {
                btnClasses += "bg-transparent border border-white/20 hover:border-white/50 text-white hover:bg-white/5";
              } else {
                // 'amber'
                btnClasses += "bg-gradient-to-r from-amber-600 to-amber-550 hover:from-amber-500 hover:to-amber-450 text-slate-950 shadow-md shadow-amber-500/10";
              }
            }

            const imgElement = (
              <div className={`relative w-full aspect-video sm:aspect-square rounded-2xl overflow-hidden border max-h-[350px] shadow-lg ${
                isLight ? 'bg-white border-rose-100' : 'bg-slate-950 border-white/5'
              }`}>
                <img src={data.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop'} className="w-full h-full object-cover opacity-100 hover:scale-[1.02] transition duration-500" alt={data.title ? `${data.title} - Curated Gift Hamper` : "Koseli Curated Hamper Spotlight Image"} referrerPolicy="no-referrer" />
              </div>
            );

            const contentElement = (
              <div className="space-y-4 text-left">
                <span className={`p-1 px-2.5 text-[9px] uppercase font-bold rounded tracking-widest inline-block font-mono ${
                  isLight ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`} style={{ color: isLight ? 'var(--primary-theme)' : undefined, borderColor: isLight ? 'rgba(var(--primary-rgb), 0.2)' : undefined }}>Artisan Spotlight</span>
                <h3 className={`text-2xl sm:text-3xl font-serif italic tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>{data.title}</h3>
                <p className={`text-xs sm:text-sm leading-relaxed max-w-lg whitespace-pre-line ${isLight ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>
                  {data.content || data.subtitle}
                </p>
                {btnLabel && (
                  <div className="pt-2">
                    <a href={btnUrl} className={btnClasses} style={{ backgroundColor: isLight && btnStyle !== 'ghost' && btnStyle !== 'violet' ? 'var(--primary-theme)' : undefined }}>
                      {btnLabel}
                    </a>
                  </div>
                )}
              </div>
            );

            if (layout === 'right') {
              return (
                <section key={secKey} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 sm:p-10 rounded-3xl border ${
                  isLight ? 'bg-white border-rose-100/60 shadow-sm' : 'bg-[#0d0d0d] border-white/5'
                }`} style={{ backgroundColor: isLight ? 'var(--theme-bg-card)' : undefined }}>
                  {contentElement}
                  {imgElement}
                </section>
              );
            }

            if (layout === 'top') {
              return (
                <section key={secKey} className={`space-y-6 p-6 sm:p-10 rounded-3xl border ${
                  isLight ? 'bg-white border-rose-100/60 shadow-sm' : 'bg-[#0d0d0d] border-white/5'
                }`} style={{ backgroundColor: isLight ? 'var(--theme-bg-card)' : undefined }}>
                  <div className="relative w-full aspect-[21/9] rounded-2.5xl overflow-hidden bg-slate-950 border border-white/5 shadow-md max-h-[250px]">
                    <img src={data.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" alt={data.title ? `${data.title} Banner View` : "Fulfillment Center Gift Showcase"} referrerPolicy="no-referrer" />
                  </div>
                  <div className="max-w-3xl text-left">
                    {contentElement}
                  </div>
                </section>
              );
            }

            if (layout === 'overlay') {
              return (
                <section key={secKey} className={`relative rounded-3xl overflow-hidden p-8 sm:p-16 flex items-center justify-start text-left border shadow-xl min-h-[380px] ${
                  isLight ? 'bg-white border-rose-100' : 'bg-black border-white/5 shadow-xl'
                }`}>
                  <div className="absolute inset-0">
                    <img src={data.imageUrl || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1200&auto=format&fit=crop'} className={`w-full h-full object-cover ${isLight ? 'opacity-20' : 'opacity-50'}`} alt={data.title ? `${data.title} Custom Gifting Overlay Background` : "Gifting background overlay pattern"} referrerPolicy="no-referrer" />
                    <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-r from-white via-white/80 to-transparent' : 'bg-gradient-to-r from-black via-black/70 to-transparent'}`} />
                  </div>
                  <div className={`relative max-w-lg backdrop-blur-md p-6 sm:p-8 rounded-2xl border space-y-4 ${
                    isLight ? 'bg-white/80 border-rose-100 shadow-sm' : 'bg-black/55 border-white/10'
                  }`}>
                    {contentElement}
                  </div>
                </section>
              );
            }

            // Default 'left'
            return (
              <section key={secKey} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 sm:p-10 rounded-3xl border ${
                isLight ? 'bg-white border-rose-100/60 shadow-sm' : 'bg-[#0d0d0d] border-white/5'
              }`} style={{ backgroundColor: isLight ? 'var(--theme-bg-card)' : undefined }}>
                {imgElement}
                {contentElement}
              </section>
            );
          }

          /* SECTION: YOUTUBE VIDEO PLAYBACK */
          case 'video':
            if (!data.youtubeId) return null;
            return (
              <section key={secKey} className="space-y-4 max-w-3xl mx-auto text-center">
                <h3 className={`text-lg font-serif italic ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>{data.title || 'Experience Gifting Magic'}</h3>
                <div className={`relative aspect-video rounded-2xl overflow-hidden shadow-md border ${
                  isLight ? 'bg-white border-rose-100' : 'bg-black border-white/5'
                }`}>
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${data.youtubeId}?autoplay=0`}
                    title="Promo video play"
                    allowFullScreen
                  />
                </div>
              </section>
            );

          /* SECTION: GOOGLE REVIEW ACCENT BADGES */
          case 'google_review': {
            // 1. Start with pre-seeded reviews
            const PRESEEDED_GOOGLE_REVIEWS = [
              {
                id: 'rev-1',
                author: 'Sunita Pradhan',
                rating: 5,
                comment: 'The floral arrangement was absolutely pristine! Delivered exactly on time in Kathmandu. My parents loved the touch. Highly recommend Koseli Xpress!',
                relativeDate: '2 days ago',
                initials: 'SP',
                avatarBg: 'bg-rose-700',
                timestamp: 1717382400
              },
              {
                id: 'rev-2',
                author: 'Anish Shrestha',
                rating: 5,
                comment: 'Top-tier customer support. They coordinated the midnight delivery flawlessly. The quality of chocolates and custom gift wrapping was beautiful.',
                relativeDate: '1 week ago',
                initials: 'AS',
                avatarBg: 'bg-emerald-700',
                timestamp: 1716952800
              },
              {
                id: 'rev-3',
                author: 'Samikshya Thapa',
                rating: 4,
                comment: 'Very helpful builders. Loved the custom options. Slight courier delay but the presentation made up for it completely. Highly satisfied!',
                relativeDate: '2 weeks ago',
                initials: 'ST',
                avatarBg: 'bg-[#492583]',
                timestamp: 1716348000
              },
              {
                id: 'rev-4',
                author: 'Prajwal Karki',
                rating: 5,
                comment: 'Simply the best online gifting service in Nepal. The customizable gift hampers make it so easy to curate something personal and exquisite.',
                relativeDate: '3 weeks ago',
                initials: 'PK',
                avatarBg: 'bg-amber-700',
                timestamp: 1715743200
              },
              {
                id: 'rev-5',
                author: 'Meera Rajopadhyaya',
                rating: 5,
                comment: 'Beautiful presentation! Every flower was fresh and fragrantly bloomed. Easy payment options from out-of-country. Will definitely order again.',
                relativeDate: '1 month ago',
                initials: 'MR',
                avatarBg: 'bg-blue-700',
                timestamp: 1715138400
              }
            ];

            let reviewerList = data.reviewsList && data.reviewsList.length > 0
              ? [...data.reviewsList]
              : [...PRESEEDED_GOOGLE_REVIEWS];

            // Filter: Only 5-star reviews
            if (data.onlyFiveStars) {
              reviewerList = reviewerList.filter(r => r.rating === 5);
            }

            // Filter: Only reviews with comments
            if (data.onlyWithComments) {
              reviewerList = reviewerList.filter(r => r.comment && r.comment.trim().length > 0);
            }

            // Sort reviews
            const reviewSort = data.sortBy || 'latest';
            if (reviewSort === 'rating') {
              reviewerList.sort((a, b) => b.rating - a.rating);
            } else {
              // 'latest'
              reviewerList.sort((a, b) => b.timestamp - a.timestamp);
            }

            // Limit display count
            const maxLimit = data.limitCount || 5;
            reviewerList = reviewerList.slice(0, maxLimit);

            return (
              <section key={secKey} className={`border p-6 sm:p-10 rounded-3xl space-y-8 ${
                isLight ? 'bg-white border-rose-100 shadow-sm shadow-rose-100/10' : 'bg-[#0b0b0b]/60 border-white/5'
              }`} style={{ backgroundColor: isLight ? 'var(--theme-bg-card)' : undefined }}>
                {/* Visual Header */}
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left pb-4 border-b ${isLight ? 'border-rose-100' : 'border-white/5'}`}>
                  {data.googleReviewUrl ? (
                    <a
                      href={data.googleReviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="space-y-1 block hover:opacity-90 transition group/header"
                    >
                      <div className="flex gap-1.5 items-center">
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#4285F4]">G</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#EA4335]">o</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#FBBC05]">o</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#4285F4]">g</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#34A853]">l</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#EA4335]">e</span>
                        <span className={`text-[10px] uppercase font-semibold font-mono tracking-wide ml-1.5 group-hover/header:underline ${isLight ? 'text-slate-500 font-bold' : 'text-slate-400'}`}>Customer Trust Verified</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity ml-1 inline-block align-middle" />
                      </div>
                      <h3 className={`text-xl sm:text-2xl font-serif italic tracking-wide group-hover/header:text-[#4285F4] transition-colors ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>{data.title || 'Excellent Google Reviews Rating'}</h3>
                      <div className={`flex items-center gap-1 text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <span className="text-rose-600 font-extrabold flex items-center gap-0.5 font-mono" style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>
                          <Star className="w-3.5 h-3.5 fill-rose-650 text-rose-500" style={{ fill: isLight ? 'var(--primary-theme)' : undefined, color: isLight ? 'var(--primary-theme)' : undefined }} /> 4.9 / 5
                        </span>
                        <span>• Based on 130+ deliveries in Nepal (Click to verify)</span>
                      </div>
                    </a>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex gap-1.5 items-center">
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#4285F4]">G</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#EA4335]">o</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#FBBC05]">o</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#4285F4]">g</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#34A853]">l</span>
                        <span className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-[#EA4335]">e</span>
                        <span className={`text-[10px] uppercase font-semibold font-mono tracking-wide ml-1.5 ${isLight ? 'text-slate-500 font-bold' : 'text-slate-400'}`}>Customer Trust Verified</span>
                      </div>
                      <h3 className={`text-xl sm:text-2xl font-serif italic tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>{data.title || 'Excellent Google Reviews Rating'}</h3>
                      <div className={`flex items-center gap-1 text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        <span className="text-rose-600 font-extrabold flex items-center gap-0.5 font-mono" style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>
                          <Star className="w-3.5 h-3.5 fill-rose-650 text-rose-500" style={{ fill: isLight ? 'var(--primary-theme)' : undefined, color: isLight ? 'var(--primary-theme)' : undefined }} /> 4.9 / 5
                        </span>
                        <span>• Based on 130+ deliveries in Nepal</span>
                      </div>
                    </div>
                  )}

                  {data.googleReviewUrl && (
                    <a
                      href={data.googleReviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-4.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center ${
                        isLight ? 'bg-white hover:bg-slate-50 text-slate-705 border-rose-200 shadow-xs' : 'bg-[#0d0d0d] hover:bg-slate-500/10 text-slate-200 border-white/10'
                      }`}
                    >
                      <span>Share Your Experience</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Reviews Horizontal Testimonials Slider/Scroll */}
                <div className="relative group/reviews">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x select-none text-left">
                    {reviewerList.map((rev) => {
                      const cardContent = (
                        <div
                          className={`min-w-[280px] sm:min-w-[340px] flex-1 max-w-[400px] snap-center border rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 transition-all duration-300 h-full text-left ${
                            isLight ? 'bg-[#FCF9F9] border-rose-100 hover:border-rose-350' : 'bg-[#0c0c0c] border-white/5 hover:border-amber-500/20'
                          }`}
                        >
                          <div className="space-y-2.5">
                            {/* Stars Rating and relative date */}
                            <div className="flex justify-between items-center">
                              <div className="flex gap-0.5" style={{ color: isLight ? 'var(--primary-theme)' : '#ec4899' }}>
                                {Array.from({ length: 5 }).map((_, sIdx) => (
                                  <Star
                                    key={sIdx}
                                    className={`w-3.5 h-3.5 ${sIdx < rev.rating ? 'fill-current text-current' : isLight ? 'text-slate-300' : 'text-slate-600'}`}
                                  />
                                ))}
                              </div>
                              <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{rev.relativeDate}</span>
                            </div>

                            {/* Comment Body markdown */}
                            <p className={`text-xs leading-relaxed italic ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                              "{rev.comment}"
                            </p>
                          </div>

                          {/* Customer Avatar profile info */}
                          <div className={`flex gap-3 items-center border-t pt-3 mt-1.5 ${isLight ? 'border-rose-100' : 'border-white/5'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rev.avatarBg} text-white font-mono text-xs font-bold shadow-2xs`}>
                              {rev.initials}
                            </div>
                            <div>
                              <span className={`text-xs font-bold block leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{rev.author}</span>
                              <span className={`text-[9px] font-medium block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Verified Customer</span>
                            </div>
                          </div>
                        </div>
                      );

                      if (data.googleReviewUrl) {
                        return (
                          <a
                            key={rev.id}
                            href={data.googleReviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block focus:outline-none shrink-0"
                          >
                            {cardContent}
                          </a>
                        );
                      }

                      return (
                        <div key={rev.id} className="shrink-0">
                          {cardContent}
                        </div>
                      );
                    })}
                    {reviewerList.length === 0 && (
                      <div className={`w-full text-center py-8 text-xs italic rounded-2xl border ${
                        isLight ? 'text-slate-500 bg-white border-rose-100' : 'text-slate-400 bg-[#0c0c0c] border-white/5'
                      }`}>
                        No reviews met current rating or comment constraints.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }

          /* SECTION: EXPANDABLE FAQS ACCORDION */
          case 'faq':
            const faqs = data.faqs || [];
            return (
              <section key={secKey} className="max-w-2xl mx-auto space-y-6 text-left">
                <div className="text-center space-y-1">
                  <h3 className={`text-2xl font-serif italic tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>{data.title || 'Gifting Questions & Support'}</h3>
                  <p className={`text-xs font-mono tracking-widest uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Reliable details about scheduling support and customized boxes.</p>
                </div>

                <div className="space-y-2.5">
                  {faqs.map((faq, faqIdx) => {
                    const isExpanded = expandedFaqIndex === faqIdx;
                    return (
                      <div key={`faq-item-${faqIdx}`} className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                        isLight ? 'bg-white border-rose-100 shadow-xs' : 'bg-[#0d0d0d] border-white/5'
                      }`}>
                        <button
                          onClick={() => setExpandedFaqIndex(isExpanded ? null : faqIdx)}
                          className={`w-full p-4 flex items-center justify-between text-left font-serif italic text-sm transition cursor-pointer hover:bg-rose-50/20 ${
                            isLight ? 'text-slate-800' : 'text-slate-205'
                          }`}
                        >
                          <span className="font-bold">{faq.question}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-rose-500" style={{ color: 'var(--primary-theme)' }} /> : <ChevronDown className="w-4 h-4 text-rose-500" style={{ color: 'var(--primary-theme)' }} />}
                        </button>
                        
                        {isExpanded && (
                          <div className={`p-4 pt-0 text-xs leading-relaxed border-t font-sans ${
                            isLight ? 'text-slate-600 border-rose-100' : 'text-slate-400 border-white/5'
                          }`}>
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );

          /* SECTION: CLIENT TESTIMONIALS BOARD REVIEWS */
          case 'reviews':
            const approvedReviews = state.reviews.filter(r => r.status === 'published');
            return (
              <section key={secKey} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className={`text-2xl font-serif italic tracking-wide ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`} style={{ color: isLight ? 'var(--primary-theme)' : undefined }}>{data.title || 'Voice of Givers & Receivers'}</h2>
                  <p className={`text-xs font-mono tracking-widest uppercase ${isLight ? 'text-rose-700 font-bold' : 'text-amber-500/85'}`} style={{ color: isLight ? 'var(--secondary-theme)' : undefined }}>{data.subtitle || 'Real expressions shared by consumers in Nepal and the Nepalese diaspora.'}</p>
                </div>

                <ReviewsSlider 
                  reviews={approvedReviews} 
                  isLight={isLight} 
                />
              </section>
            );

          /* SECTION: CURATED TEXT WRITER BLOCK */
          case 'text': {
            const HeadingTag = (data.headingSize || 'h2') as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
            
            const alignmentClass = 
              data.textAlignment === 'center' ? 'text-center' :
              data.textAlignment === 'right' ? 'text-right' :
              data.textAlignment === 'justify' ? 'text-justify' : 'text-left';

            const headingSizeClasses: Record<string, string> = {
              h1: 'text-3xl sm:text-4xl md:text-5xl font-serif font-extrabold tracking-tight',
              h2: 'text-2xl sm:text-3xl font-serif italic font-bold tracking-wide',
              h3: 'text-xl sm:text-2xl font-serif font-bold tracking-normal',
              h4: 'text-lg sm:text-xl font-sans font-semibold tracking-normal',
              h5: 'text-base font-sans font-bold uppercase tracking-wider',
              h6: 'text-sm font-sans font-extrabold tracking-widest uppercase',
              p: 'text-sm sm:text-base font-sans font-normal leading-relaxed text-slate-700'
            };

            const headerClass = headingSizeClasses[HeadingTag] || headingSizeClasses.h2;

            return (
              <section key={secKey} className={`max-w-3xl mx-auto space-y-4 py-8 px-4 ${alignmentClass}`}>
                {data.title && (
                  <HeadingTag
                    className={`${headerClass} ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}
                    style={{ color: isLight ? 'var(--primary-theme)' : undefined }}
                  >
                    {data.title}
                  </HeadingTag>
                )}
                
                {data.subtitle && (
                  <p className={`text-xs font-mono tracking-widest uppercase font-bold ${isLight ? 'text-rose-700' : 'text-amber-500'}`} style={{ color: isLight ? 'var(--secondary-theme)' : undefined }}>
                    {data.subtitle}
                  </p>
                )}
                
                {data.content && (
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isLight ? 'text-slate-650' : 'text-slate-305'}`}>
                    {data.content}
                  </p>
                )}

                {data.buttonEnabled && data.buttonText && (
                  <div className={`pt-3 ${
                    data.textAlignment === 'center' ? 'flex justify-center' :
                    data.textAlignment === 'right' ? 'flex justify-end' :
                    'flex justify-start'
                  }`}>
                    <a
                      href={data.buttonUrl || '#'}
                      className={`inline-block px-6 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-xs cursor-pointer ${
                        data.buttonStyle === 'filled_rose' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10' :
                        data.buttonStyle === 'filled_amber' ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/10' :
                        data.buttonStyle === 'outline_rose' ? 'border border-rose-500 text-rose-600 hover:bg-rose-50' :
                        data.buttonStyle === 'minimal_slate' ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md' :
                        'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10'
                      }`}
                    >
                      {data.buttonText}
                    </a>
                  </div>
                )}
              </section>
            );
          }

          /* SECTION: SECURED COMPILING CUSTOM CODE CONTAINER */
          case 'code_embed':
            return (
              <section key={secKey} className="w-full py-6 text-left max-w-7xl mx-auto px-4">
                {data.title && (
                  <div className={`mb-3 border-b pb-2 ${isLight ? 'border-rose-100' : 'border-white/[0.04]'}`}>
                    <h4 className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{data.title}</h4>
                    {data.subtitle && <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>{data.subtitle}</p>}
                  </div>
                )}
                {data.codeEmbed && (
                  <div 
                    className="overflow-x-auto w-full"
                    dangerouslySetInnerHTML={{ __html: data.codeEmbed }} 
                  />
                )}
              </section>
            );

          /* SECTION: DELIVERIES COUNTDOWN WIDGET */
          case 'delivery_countdown':
            return (
              <DeliveryCountdown
                key={secKey}
                sec={section}
                isLight={isLight}
              />
            );

          /* SECTION: DEDICATED COMPLIANCE FOOTER BUILDER */
          case 'footer_builder':
            return (
              <Footer
                key={secKey}
                state={state}
                sectionData={section.data}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
