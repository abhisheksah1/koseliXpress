import React, { useState } from 'react';
import { DatabaseState, CustomPageSection, Product, Category, CurrencySettings } from '../../types';
import ProductCard from './ProductCard';
import DeliveryCountdown from './DeliveryCountdown';
import ReviewsSlider from './ReviewsSlider';
import Footer from './Footer';
import { Star, ChevronDown, ChevronUp, Sparkles, ExternalLink, Gift, Truck, Shield, Heart, Clock, MapPin, ArrowRight } from 'lucide-react';

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
  const primary = state.appearance?.primaryColor || '#E91E63';
  const secondary = state.appearance?.secondaryColor || '#C2185B';
  const defaultHeroImage = 'https://images.unsplash.com/photo-1513885539091-8f945a81cd37?q=80&w=2000&auto=format&fit=crop';

  return (
    <div className={`font-sans pb-16 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
      {sections.map((section, sectionIdx) => {
        const { id, type, data } = section;
        const secKey = id || `sec-${type}-${sectionIdx}`;
        const isHomeSection = type === 'banner' || type === 'trust_strip';
        const sectionWrap = isHomeSection ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';
        const sectionPad = type === 'banner' ? '' : (isHomeSection ? '' : 'py-6 sm:py-8');

        const wrap = (content: React.ReactNode) => (
          <div key={secKey} className={`${sectionWrap} ${sectionPad}`}>{content}</div>
        );

        switch (type) {
          
          /* SECTION: PURPLE GIFT-SHOP HERO (reference layout) */
          case 'banner': {
            const scriptTitle = (data as any).scriptTitle || 'Celebrate';
            const boldSubtitle = (data as any).boldSubtitle || 'SAME DAY DELIVERY';
            const heroNavLinks: string[] = (data as any).heroNavLinks || ['FLOWER DELIVERY', 'ALL GIFT ITEMS', 'FRESH FLOWER', 'CAKES'];
            const pillTags: string[] = (data as any).pillTags || ['All Over Nepal', 'Fresh Flowers | Long Life Flowers'];
            const heroImage = data.imageUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop';

            return wrap(
              <section className="relative overflow-hidden hero-purple-gradient hero-floral-pattern">
                {/* Hero sub-navigation */}
                <div className="border-b border-pink-200/40 bg-white/30 backdrop-blur-sm">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex items-center justify-center gap-4 sm:gap-8 py-3 overflow-x-auto scrollbar-hide">
                      {heroNavLinks.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => document.getElementById('shop-collection')?.scrollIntoView({ behavior: 'smooth' })}
                          className="text-[10px] sm:text-xs font-bold tracking-[0.15em] text-slate-800 hover:text-[#E91E63] whitespace-nowrap transition uppercase"
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Left: typography */}
                    <div className="relative text-left space-y-4 sm:space-y-6 animate-fade-up order-2 lg:order-1">
                      {/* Sparkle decorations */}
                      <span className="absolute -top-4 left-[45%] text-pink-400 text-lg hidden sm:block">✦</span>
                      <span className="absolute top-24 -left-2 text-pink-300 text-sm hidden sm:block">✦</span>

                      <h1
                        className="font-script text-[5rem] sm:text-[6.5rem] lg:text-[7.5rem] leading-[0.85] font-bold tracking-tight"
                        style={{ color: secondary }}
                      >
                        {scriptTitle}
                      </h1>

                      <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                        {boldSubtitle}
                      </p>

                      {data.subtitle && (
                        <p className="text-sm sm:text-base text-slate-600 max-w-md leading-relaxed hidden sm:block">
                          {data.subtitle}
                        </p>
                      )}

                      {data.buttonText && (
                        <div className="pt-2">
                          <a
                            href={data.buttonUrl || '#shop-collection'}
                            onClick={(e) => {
                              if ((data.buttonUrl || '#shop-collection').startsWith('#')) {
                                e.preventDefault();
                                document.getElementById('shop-collection')?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="inline-flex items-center justify-center px-10 py-3.5 rounded-full text-sm font-bold tracking-[0.2em] text-white uppercase shadow-lg transition hover:scale-[1.03] hover:shadow-xl"
                            style={{ backgroundColor: primary, boxShadow: `0 8px 24px rgba(233, 30, 99, 0.35)` }}
                          >
                            {data.buttonText}
                          </a>
                        </div>
                      )}

                      {/* Pill tags */}
                      <div className="flex flex-wrap gap-2 pt-4">
                        {pillTags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-4 py-2 rounded-full text-xs font-semibold text-slate-800 border-2 border-slate-900 bg-white/60 backdrop-blur-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: arch portrait */}
                    <div className="relative flex justify-center order-1 lg:order-2">
                      <div
                        className="relative w-[280px] h-[380px] sm:w-[320px] sm:h-[440px] lg:w-[360px] lg:h-[480px] rounded-t-[999px] rounded-b-[999px] overflow-hidden border-[6px] border-white shadow-2xl"
                        style={{ boxShadow: `0 24px 60px ${primary}33` }}
                      >
                        <img
                          src={heroImage}
                          alt="Premium flower delivery"
                          className="w-full h-full object-cover object-top"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="absolute top-8 right-8 sm:right-16 text-pink-400 text-xl">✦</span>
                      <span className="absolute bottom-16 left-4 text-pink-400 text-sm">✦</span>
                    </div>
                  </div>
                </div>
              </section>
            );
          }

          case 'trust_strip': {
            const items = data.items || [
              { icon: 'truck', title: 'Express Delivery', desc: 'Same-day in Kathmandu Valley' },
              { icon: 'gift', title: 'Artisan Wrapped', desc: 'Every gift hand-prepared' },
              { icon: 'shield', title: 'Secure Payments', desc: 'eSewa, Khalti & cards' },
              { icon: 'heart', title: 'Made with Love', desc: 'Premium quality guaranteed' },
            ];
            const iconMap: Record<string, React.ReactNode> = {
              truck: <Truck className="w-5 h-5" />,
              gift: <Gift className="w-5 h-5" />,
              shield: <Shield className="w-5 h-5" />,
              heart: <Heart className="w-5 h-5" />,
              clock: <Clock className="w-5 h-5" />,
              map: <MapPin className="w-5 h-5" />,
            };
            return wrap(
              <section className="relative -mt-8 z-10 max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="premium-card rounded-2xl p-4 sm:p-5 flex flex-col gap-2 transition duration-300">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                        {iconMap[item.icon] || <Sparkles className="w-5 h-5" />}
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          case 'features': {
            const feats = data.items || [];
            return wrap(
              <section className="py-16 sm:py-20">
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
                  <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: secondary }}>{data.subtitle || 'Why Koseli Xpress'}</p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold italic text-slate-900">{data.title || 'The Premium Gifting Experience'}</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                  {feats.map((f: any, i: number) => (
                    <div key={i} className="premium-card rounded-3xl p-8 text-center space-y-4 transition duration-300">
                      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `rgba(var(--primary-rgb), 0.08)`, color: primary }}>
                        {f.emoji || '✦'}
                      </div>
                      <h3 className="font-display text-xl font-semibold italic text-slate-900">{f.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          case 'cta_band':
            return wrap(
              <section className="py-16 sm:py-20">
                <div
                  className="rounded-3xl px-8 py-14 sm:py-16 text-center space-y-6 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZoLTJWMjRoMnY0em0wLTZoLTJWMmg0djR6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
                  <h2 className="relative font-display text-3xl sm:text-4xl font-semibold italic text-white">{data.title || 'Ready to Send Something Special?'}</h2>
                  <p className="relative text-white/85 max-w-lg mx-auto text-sm sm:text-base">{data.subtitle || 'Browse our curated collection or build a custom hamper for your loved ones.'}</p>
                  {data.buttonText && (
                    <a
                      href={data.buttonUrl || '#shop-collection'}
                      className="relative inline-flex items-center gap-2 px-8 py-3.5 bg-white text-slate-900 rounded-full text-sm font-bold tracking-wide hover:bg-white/95 transition shadow-lg"
                    >
                      {data.buttonText}
                      <ArrowRight className="w-4 h-4" />
                    </a>
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

            return wrap(
              <section id="shop-collection" className="py-16 sm:py-20 space-y-10">
                <div className="text-center max-w-2xl mx-auto space-y-3">
                  <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: secondary }}>{data.subtitle || 'Our Collections'}</p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold italic text-slate-900">{data.title || 'Shop by Category'}</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {targetCategories.map((cat, catIdx) => {
                    const prodCount = state.products.filter(p => p.categoryId === cat.id && p.status !== 'deleted').length;
                    return (
                      <div
                        key={`cat-grid-item-${cat.id || catIdx}`}
                        onClick={() => onNavigateToCategory(cat.id)}
                        className="group relative h-52 sm:h-60 rounded-2xl overflow-hidden cursor-pointer premium-card transition duration-500"
                      >
                        <img src={cat.image || defaultHeroImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={cat.name} referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute inset-x-5 bottom-5 text-left">
                          <h4 className="font-display text-lg sm:text-xl italic text-white font-medium">{cat.name}</h4>
                          <span className="text-[11px] text-white/80 tracking-wide">{prodCount} items · Explore →</span>
                        </div>
                      </div>
                    );
                  })}
                  {targetCategories.length === 0 && (
                    <div className="col-span-full grid sm:grid-cols-3 gap-4">
                      {['Flowers & Bouquets', 'Gourmet Cakes', 'Gift Hampers'].map((label, i) => (
                        <div key={i} className="premium-card rounded-2xl p-8 text-center space-y-3 border-dashed">
                          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-white text-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                            <Gift className="w-5 h-5" />
                          </div>
                          <h4 className="font-display text-lg italic text-slate-700">{label}</h4>
                          <p className="text-xs text-slate-400">Add categories from Admin → Products</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          }

          /* SECTION: DYNAMIC PRODUCTS SELECTION SHOWCASE GRID */
          case 'products_grid': {
            const prodIds = data.productIds || [];
            let targetedProducts = prodIds.length > 0
              ? state.products.filter(p => prodIds.includes(p.id) && p.status !== 'deleted')
              : state.products.filter(p => p.status !== 'deleted' && p.status !== 'draft').slice(0, 6);
            
            return wrap(
              <section className="py-16 sm:py-20 space-y-10">
                <div className="text-center max-w-2xl mx-auto space-y-3">
                  <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: secondary }}>{data.subtitle || 'Curated Selection'}</p>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold italic text-slate-900">{data.title || 'Featured Gifts'}</h2>
                </div>

                {targetedProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
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
                ) : (
                  <div className="premium-card rounded-3xl p-12 sm:p-16 text-center max-w-2xl mx-auto space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                      <Gift className="w-8 h-8" />
                    </div>
                    <h3 className="font-display text-2xl italic text-slate-800">Your Collection Awaits</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">Products you add in the admin panel will appear here automatically — beautifully presented for your customers.</p>
                  </div>
                )}
              </section>
            );
          }

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
                btnClasses += "bg-[#E91E63] hover:bg-[#C2185B] text-white shadow-md shadow-pink-950/20";
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
                <h3 className="font-display text-2xl sm:text-3xl font-semibold italic text-slate-900">{data.title}</h3>
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
            return wrap(
              <section id={data.sectionId || secKey} className={`grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center p-6 sm:p-10 rounded-3xl premium-card`}>
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
                avatarBg: 'bg-[#E91E63]',
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
