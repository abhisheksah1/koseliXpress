import React, { useState, useEffect } from 'react';
import { Product, DatabaseState, CurrencySettings, Review, ProductStatus } from '../../types';
import { X, Star, Sparkles, Send, ShoppingBasket, Upload, Trash2 } from 'lucide-react';
import { getProductStock, isProductOutOfStock, isProductOutOfStockForCustomer, isProductLowStockForCustomer } from '../../utils/stockUtils';

const fallbackProductImage = 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop';

function cleanImageUrl(url?: string): string {
  const cleaned = (url || '').replace(/&amp;/g, '&').trim();
  if (!cleaned) return fallbackProductImage;
  return cleaned.startsWith('//') ? `https:${cleaned}` : cleaned;
}

interface ProductDetailModalProps {
  productId: string;
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
  selectedCurrency: CurrencySettings;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    customMessage?: string,
    customImageUrl?: string,
    selectedVariations?: { name: string; value: string; priceAdjustment: number }[]
  ) => void;
}

export default function ProductDetailModal({
  productId,
  state,
  onUpdateState,
  selectedCurrency,
  onClose,
  onAddToCart
}: ProductDetailModalProps) {
  
  const [activeProductId, setActiveProductId] = useState(productId);

  useEffect(() => {
    setActiveProductId(productId);
  }, [productId]);

  const product = state.products.find(p => p.id === activeProductId);
  if (!product) return null;

  const isOutOfStock = isProductOutOfStockForCustomer(product, state.products);
  const actualStock = getProductStock(product, state.products);

  const isLight = true; // Force theme-based light mode for complete branding consistency

  const subProductsInCombo = product.isHamper && product.hamperItems && state.products
    ? product.hamperItems
        .map(item => state.products.find(p => p.id === item.productId))
        .filter((p): p is Product => !!p && p.status !== 'deleted')
    : [];

  const resolvedImages = React.useMemo(() => {
    const base = product.images && product.images.length > 0
      ? product.images.map(cleanImageUrl).filter(Boolean)
      : [fallbackProductImage];

    if (product.isHamper && subProductsInCombo.length > 0) {
      // Get the first image of each subproduct, skipping clean duplicates
      const subImages = subProductsInCombo
        .map(sub => cleanImageUrl(sub.images?.[0]))
        .filter((img): img is string => !!img && !base.includes(img));
      return [...base, ...subImages];
    }
    return base;
  }, [product, subProductsInCombo]);

  // Personalization states
  const [customCakeMsg, setCustomCakeMsg] = useState('');
  const [customGiftMsg, setCustomGiftMsg] = useState('');
  const [customImg, setCustomImg] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Variable selector (dropdown or category options configured from Admin)
  const [selectedVarOptions, setSelectedVarOptions] = useState<{ [variationId: string]: { value: string; priceAdjustment: number } }>({});

  // Dynamic variations for any component products included in Gifting Combo
  const [hamperSubVarOptions, setHamperSubVarOptions] = useState<{ [key: string]: { value: string; priceAdjustment: number } }>({});

  // Pre-select first option of any variations by default, and reset personalization state
  useEffect(() => {
    setCustomCakeMsg('');
    setCustomGiftMsg('');
    setCustomImg('');
    setQuantity(1);
    setActiveImgIdx(0);

    if (product && product.variations && product.variations.length > 0) {
      const initial: { [variationId: string]: { value: string; priceAdjustment: number } } = {};
      product.variations.forEach((v) => {
        if (v.options && v.options.length > 0) {
          initial[v.id] = {
            value: v.options[0].value,
            priceAdjustment: v.options[0].priceAdjustment || 0
          };
        }
      });
      setSelectedVarOptions(initial);
    } else {
      setSelectedVarOptions({});
    }

    // Pre-select for combo subcomponents as well
    if (product && product.isHamper && product.hamperItems) {
      const initialSub: { [key: string]: { value: string; priceAdjustment: number } } = {};
      product.hamperItems.forEach((item) => {
        const subProd = state.products.find(p => p.id === item.productId);
        if (subProd && subProd.variations) {
          subProd.variations.forEach((v) => {
            const preset = (item.selectedVariations || []).find(sv => sv.name === v.name);
            if (!preset && v.options && v.options.length > 0) {
              const key = `${subProd.id}-${v.id}`;
              initialSub[key] = {
                value: v.options[0].value,
                priceAdjustment: v.options[0].priceAdjustment || 0
              };
            }
          });
        }
      });
      setHamperSubVarOptions(initialSub);
    } else {
      setHamperSubVarOptions({});
    }
  }, [product?.id, state.products]);

  // Quantity changer state
  const [quantity, setQuantity] = useState(1);

  // Review submission inputs
  const [reviewerName, setReviewerName] = useState('');
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  // Picture slide index
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Convert base price
  const hasDiscount = product.discountPrice !== undefined && product.discountPrice > 0 && product.discountPrice < product.price;
  const basePriceForCalculation = hasDiscount ? product.discountPrice! : product.price;
  const convertedPrice = basePriceForCalculation * (selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR);
  const originalPriceConverted = product.price * (selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR);
  
  // Calculate total adjusted price (original price + selected variations)
  let adjustedPrice = convertedPrice;
  const currencyRate = selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR;
  (Object.values(selectedVarOptions) as { value: string; priceAdjustment: number }[]).forEach((opt) => {
    adjustedPrice += opt.priceAdjustment * currencyRate;
  });
  if (product.isHamper) {
    (Object.values(hamperSubVarOptions) as { value: string; priceAdjustment: number }[]).forEach((opt) => {
      adjustedPrice += opt.priceAdjustment * currencyRate;
    });
  }

  const reviewsList = state.reviews.filter(r => r.productId === product.id && r.status === 'published');
  
  // Submit customer review
  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName || !reviewComment) {
      alert('Reviewer Name and comments are required.');
      return;
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId: product.id,
      customerName: reviewerName,
      rating: reviewScore,
      comment: reviewComment,
      status: 'unpublished', // Set to draft as requested
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      reviews: [...state.reviews, newReview]
    });

    setReviewerName('');
    setReviewComment('');
    setReviewScore(5);
    setReviewFeedback('Review posted! It operates under moderation audit. An admin can publish this from the workspace reviewer tools.');
    setTimeout(() => setReviewFeedback(null), 8500);
  };

  // Get automatic 4 recommended "You May Also Like" products in real-time based on categories and price
  const recommendedProducts = React.useMemo(() => {
    if (!product) return [];
    const others = state.products.filter(p => p.id !== product.id && p.status !== ProductStatus.DELETED);
    
    const nameLower = (product.name || '').toLowerCase();
    const isCake = nameLower.includes('cake') || product.categoryId.includes('cake');
    const isFlower = nameLower.includes('flower') || nameLower.includes('rose') || product.categoryId.includes('flower');
    
    const scored = others.map(p => {
      let score = 0;
      const pName = (p.name || '').toLowerCase();
      
      // Cake complements: prioritize flowers, chocolates, cards, teddies
      if (isCake) {
        if (pName.includes('flower') || pName.includes('rose') || p.categoryId.includes('flower')) score += 70;
        if (pName.includes('chocolate') || pName.includes('ferrero') || p.categoryId.includes('chocolate')) score += 50;
        if (pName.includes('card') || pName.includes('celebration')) score += 40;
        if (pName.includes('teddy') || pName.includes('toy')) score += 30;
        if (pName.includes('cake') || p.categoryId.includes('cake')) score -= 20; // Recommend helper add-on instead
      }
      // Flower complements: prioritize cake, chocolates, cards, teddies
      else if (isFlower) {
        if (pName.includes('cake') || p.categoryId.includes('cake')) score += 70;
        if (pName.includes('chocolate') || pName.includes('ferrero') || p.categoryId.includes('chocolate')) score += 50;
        if (pName.includes('card') || pName.includes('celebration')) score += 40;
        if (pName.includes('teddy') || pName.includes('toy')) score += 30;
        if (pName.includes('flower') || p.categoryId.includes('flower')) score -= 20;
      }
      else {
        // Default complements: push flowers, cake, chocolate, card
        if (pName.includes('cake') || p.categoryId.includes('cake')) score += 40;
        if (pName.includes('flower') || p.categoryId.includes('flower')) score += 40;
        if (pName.includes('card') || pName.includes('celebration')) score += 30;
        if (pName.includes('chocolate')) score += 30;
        if (p.categoryId === product.categoryId) {
          score += 15;
        }
      }

      // Price proximity rating (cross-sell value alignment)
      const priceDiff = Math.abs(p.price - product.price);
      if (priceDiff <= 650) {
        score += 25; // sweet-spot related add-on price
      } else if (p.price < product.price) {
        score += 15; // affordable helper add-on
      }

      return { product: p, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map(item => item.product)
      .slice(0, 4);
  }, [product, state.products]);

  return (
    <div className="fixed inset-0 z-50 bg-[#020202]/75 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-y-auto">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Structured Top-Down product page */}
      <div 
        role="dialog" 
        className={`relative w-full h-screen md:h-[95vh] md:max-h-[95vh] max-w-xl md:max-w-7xl rounded-none md:rounded-2xl overflow-hidden shadow-2xl flex flex-col z-10 animate-fade-in font-sans transition-colors ${
          isLight ? 'bg-[#FCF9F9] border-0 md:border border-rose-100 text-slate-800' : 'bg-[#0d0d0d] border-0 md:border border-white/10 text-slate-350'
        }`}
      >
        
        {/* Absolute header sticky Close Button */}
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-20 shrink-0 ${
          isLight ? 'bg-[#FCF9F9]/95 border-rose-100/60' : 'bg-[#0d0d0d]/95 border-white/10'
        } backdrop-blur-md`}>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
            🛒 Product Detail
          </span>
          <button 
            type="button"
            onClick={onClose}
            className={`p-1.5 hover:bg-amber-500 hover:text-slate-950 rounded-full border transition cursor-pointer ${
              isLight ? 'bg-white text-slate-600 border-slate-200' : 'bg-[#050505]/80 text-white border-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified vertical scrollable flow matching the Koseli Xpress PDP schema */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start">
            
            {/* Left Column: Image Gallery Visuals */}
            <div className="md:col-span-6 lg:col-span-7 space-y-4">

              {/* 1. Product Image */}
          <div className="space-y-3">
            <div className={`aspect-square rounded-2xl overflow-hidden shadow-xs border relative bg-white ${
              isLight ? 'border-rose-100' : 'border-white/5'
            }`}>
              <img 
                src={(resolvedImages && resolvedImages[activeImgIdx]) || fallbackProductImage}
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = fallbackProductImage;
                }}
              />

              {/* Dynamic inclusion of subproduct images inside the main combo image container */}
              {product.isHamper && subProductsInCombo.length > 0 && (
                <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-lg border border-rose-100/60 z-20 max-w-[90%] text-left">
                  <div className="text-[9px] uppercase tracking-wider font-extrabold text-[#991b1b] font-mono leading-none">
                    Combo Includes ({subProductsInCombo.length})
                  </div>
                  <div className="flex items-center gap-1.5">
                    {subProductsInCombo.slice(0, 5).map((sub, sIdx) => (
                      <div key={`${sub.id}-${sIdx}`} className="relative group/tooltip col">
                        <img
                          src={cleanImageUrl(sub.images?.[0])}
                          alt={sub.name}
                          className="w-10 h-10 sm:w-11 sm:h-11 object-cover rounded-xl border border-rose-100/50 shadow-xs hover:scale-110 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = fallbackProductImage;
                          }}
                        />
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-slate-900/95 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                          {sub.name}
                        </span>
                      </div>
                    ))}
                    {subProductsInCombo.length > 5 && (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-rose-50 border border-rose-150 text-xs text-[#991b1b] font-black flex items-center justify-center rounded-xl shadow-xs">
                        +{subProductsInCombo.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Other images (display if there are 2 or more of them) */}
            {resolvedImages && resolvedImages.length > 1 && (
              <div className="flex gap-2.5 justify-center overflow-x-auto pb-1 select-none">
                {resolvedImages.map((img, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setActiveImgIdx(i)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImgIdx === i ? 'border-amber-500 ring-4 ring-amber-500/10 scale-102' : 'border-slate-300 hover:border-slate-450'
                    }`}
                  >
                    <img 
                      src={img || fallbackProductImage}
                      className="w-full h-full object-cover" 
                      alt="" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        e.currentTarget.src = fallbackProductImage;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Information, Pricing & Checkout Selections */}
        <div className="md:col-span-6 lg:col-span-5 space-y-6">

          {/* 3. Product Name (styled as H1) */}
          <div className="space-y-1.5 text-left">
            <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {product.name}
            </h1>
            
            {(() => {
              const matchedCategory = state.categories.find(c => c.id === product.categoryId);
              return matchedCategory ? (
                <h2 className="text-xs font-bold text-[#a78bfa] tracking-wider uppercase flex items-center gap-1">
                  Category: <span className="text-amber-500 font-extrabold">{matchedCategory.name}</span>
                </h2>
              ) : null;
            })()}
          </div>

          {/* 4. Price & 5. Shipping Calculated on checkout Disclaimer */}
          <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left border ${
            isLight ? 'bg-white border-rose-100' : 'bg-[#050505] border-white/5'
          }`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Price:</span>
              <div className="flex items-baseline flex-wrap gap-2">
                {hasDiscount && (
                  <span className="text-sm line-through text-slate-500 font-bold font-mono">
                    {selectedCurrency.symbol} {originalPriceConverted.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </span>
                )}
                <div className="text-3xl font-mono font-black text-amber-500">
                  {selectedCurrency.symbol} {adjustedPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                </div>
                {hasDiscount && (
                  <span className="bg-rose-600 text-white text-[9.5px] font-extrabold px-1.5 py-0.5 rounded tracking-wider font-mono">
                    {Math.round(((product.price - product.discountPrice!) / product.price) * 100)}% OFF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-450 italic font-medium">
                (shipping is calculated on checkout)
              </p>
            </div>

            <div className="shrink-0 font-mono">
              <span className={`inline-block px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg border ${
                isOutOfStock ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                {isOutOfStock ? 'Sold Out' : 'Available'}
              </span>
            </div>
          </div>

          {/* 6. Dynamic Variables / Variations set from Admin User */}
          {product.variations && product.variations.length > 0 && (
            <div className={`p-4 rounded-xl space-y-4 text-left border ${
              isLight ? 'bg-white border-rose-100' : 'bg-[#050505] border-white/5'
            }`}>
              {product.variations.map((v) => {
                const selected = selectedVarOptions[v.id];
                return (
                  <div key={v.id} className="space-y-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-705' : 'text-slate-350'}`}>
                      Select {v.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {v.options.map((opt, oIdx) => {
                        const isChosen = selected?.value === opt.value;
                        const isOutOfStock = !product.allowOrderWhenOutOfStock && opt.stock !== undefined && opt.stock <= 0;
                        return (
                          <button
                            type="button"
                            key={oIdx}
                            disabled={isOutOfStock}
                            onClick={() => {
                              setSelectedVarOptions({
                                ...selectedVarOptions,
                                [v.id]: opt
                              });
                            }}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 select-none ${
                              isChosen 
                                ? 'bg-amber-500 text-[#050505] border-amber-500 shadow-md ring-4 ring-amber-500/10 scale-[1.02]'
                                : isOutOfStock
                                ? 'opacity-40 border-dashed border-slate-300 line-through cursor-not-allowed bg-slate-100 text-slate-400'
                                : isLight
                                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
                                : 'bg-[#0d0d0d] border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer'
                            }`}
                          >
                            <span>{opt.value}{isOutOfStock ? ' (Sold Out)' : (!product.allowOrderWhenOutOfStock && opt.stock !== undefined) ? ` (${opt.stock} left)` : ''}</span>
                            {opt.priceAdjustment !== 0 && (
                              <span className={`text-[10px] font-mono font-black ${isChosen ? 'text-[#050505] bg-[#050505]/10 px-1 py-0.5 rounded' : 'text-amber-550'}`}>
                                {opt.priceAdjustment > 0 ? `+ Rs.${opt.priceAdjustment}` : `- Rs.${Math.abs(opt.priceAdjustment)}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 7. Personalize Your Gift (Optional) */}
          {(product.allowCakeMessage || product.allowGiftMessage || product.allowPhotoUpload) && (
            <div className={`p-4 rounded-xl border space-y-4 text-left text-xs ${
              isLight ? 'bg-white border-rose-100' : 'bg-[#050505] border-white/5'
            }`}>
              <div className="flex items-center gap-1.5 pb-2 border-b border-rose-100/50">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className={`font-bold uppercase tracking-wide text-[11px] ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  Personalize Your Gift (Optional)
                </span>
              </div>

              {/* Message over Cake icing */}
              {product.allowCakeMessage && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-650 font-mono">
                    Cake Icing Message
                  </label>
                  <textarea
                    rows={2}
                    maxLength={100}
                    placeholder="e.g. 'Happy 25th Born Day Rohan!' or cake inscription..."
                    className={`w-full p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 border ${
                      isLight ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-[#0d0d0d] text-white border-white/10'
                    }`}
                    value={customCakeMsg}
                    onChange={(e) => setCustomCakeMsg(e.target.value)}
                  />
                </div>
              )}

              {/* Message over Gift Card / greeting */}
              {product.allowGiftMessage && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] font-mono">
                    Gift Card / Written Greeting
                  </label>
                  <textarea
                    rows={2}
                    maxLength={180}
                    placeholder="e.g. 'Wishing you the absolute best on this new chapter!' or greeting card note..."
                    className={`w-full p-2.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 border ${
                      isLight ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-[#0d0d0d] text-white border-white/10'
                    }`}
                    value={customGiftMsg}
                    onChange={(e) => setCustomGiftMsg(e.target.value)}
                  />
                </div>
              )}

              {/* Upload image for custom photo print */}
              {product.allowPhotoUpload && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                    Custom Image For Personalized Gift Print
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <label className={`flex-1 w-full p-3 border border-dashed hover:border-amber-500/35 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition group ${
                      isLight ? 'bg-slate-50 text-slate-500 border-slate-250' : 'bg-[#0d0d0d] text-slate-400 border-white/15'
                    }`}>
                      <Upload className="w-5 h-5 text-slate-500 group-hover:text-amber-500 transition" />
                      <span className="text-[10px] text-center font-semibold">
                        {isUploading ? 'Encoding file...' : 'Choose File to Upload Print'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const imgHtml = new Image();
                            imgHtml.onload = () => {
                              const maxDim = 800; // Optimal for displaying and printing custom designs
                              let w = imgHtml.width;
                              let h = imgHtml.height;
                              if (w > maxDim || h > maxDim) {
                                if (w > h) {
                                  h = Math.round((h * maxDim) / w);
                                  w = maxDim;
                                } else {
                                  w = Math.round((w * maxDim) / h);
                                  h = maxDim;
                                }
                              }
                              const canvas = document.createElement('canvas');
                              canvas.width = w;
                              canvas.height = h;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(imgHtml, 0, 0, w, h);
                                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
                                setCustomImg(compressedBase64);
                              } else {
                                setCustomImg(event.target?.result as string);
                              }
                              setIsUploading(false);
                            };
                            imgHtml.onerror = () => {
                              setCustomImg(event.target?.result as string);
                              setIsUploading(false);
                            };
                            imgHtml.src = event.target?.result as string;
                          };
                          reader.onerror = () => {
                            alert('Failed to read custom image file.');
                            setIsUploading(false);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>

                    {customImg && (
                      <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10 group bg-slate-950 flex items-center justify-center shadow-xs">
                        <img src={customImg} className="w-full h-full object-cover" alt="Print Preview" />
                        <button
                          type="button"
                          onClick={() => setCustomImg('')}
                          className="absolute inset-0 bg-slate-950/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer text-rose-500 hover:text-rose-450"
                          title="Remove uploaded image"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. Quantity & 9. Add to Basket Controls */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-left ${
            isLight ? 'bg-white border-rose-100' : 'bg-[#050505] border-white/5'
          }`}>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Quantity:
              </span>
              <div className="flex items-center border border-slate-350 rounded-lg overflow-hidden shrink-0 bg-white shadow-xs">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="px-3.5 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent font-bold cursor-pointer text-sm"
                >
                  -
                </button>
                <span className="px-4 py-2 font-mono font-black text-slate-900 border-l border-r border-slate-200 text-center min-w-[40px] text-sm">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={actualStock > 0 && quantity >= actualStock}
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="px-3.5 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-30 font-bold cursor-pointer text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div className="w-full sm:flex-1">
              {!isOutOfStock ? (
                <button
                  type="button"
                  onClick={() => {
                    // Check if all variations are selected
                    if (product.variations && product.variations.length > 0) {
                      const missed = product.variations.find(v => !selectedVarOptions[v.id]);
                      if (missed) {
                        alert(`Please select an option for "${missed.name}" first.`);
                        return;
                      }
                    }

                    // For dynamic items in Gift Hamper combo, ensure the customer chose all dynamic variation options!
                    if (product.isHamper && product.hamperItems) {
                      for (const item of product.hamperItems) {
                        const subProduct = state.products.find(p => p.id === item.productId);
                        if (subProduct && subProduct.variations) {
                          for (const v of subProduct.variations) {
                            const preset = (item.selectedVariations || []).find(sv => sv.name === v.name);
                            if (!preset) {
                              // Dynamic options must be selected
                              const key = `${item.productId}-${v.id}`;
                              if (!hamperSubVarOptions[key]) {
                                alert(`Please select a ${v.name} option for the included "${subProduct.name}".`);
                                return;
                              }
                            }
                          }
                        }
                      }
                    }

                    const itemsMsg: string[] = [];
                    // Append message details representing elected variations
                    const variationsArrayString = (Object.entries(selectedVarOptions) as [string, { value: string; priceAdjustment: number }][]).map(([vId, opt]) => {
                      const v = product.variations?.find(x => x.id === vId);
                      return `${v ? v.name : 'Option'}: ${opt.value}`;
                    }).join(' | ');

                    if (variationsArrayString) {
                      itemsMsg.push(variationsArrayString);
                    }

                    // Format customer selected variations for hamper sub-components
                    const hamperSubDetails: string[] = [];
                    if (product.isHamper && product.hamperItems) {
                      product.hamperItems.forEach(item => {
                        const subProduct = state.products.find(p => p.id === item.productId);
                        if (subProduct) {
                          const itemParts: string[] = [];
                          // Display preset options
                          if (item.selectedVariations) {
                            item.selectedVariations.forEach(sv => {
                              itemParts.push(`${sv.name}: ${sv.value}`);
                            });
                          }
                          // Display dynamic customer selections
                          if (subProduct.variations) {
                            subProduct.variations.forEach(v => {
                              const preset = (item.selectedVariations || []).find(sv => sv.name === v.name);
                              if (!preset) {
                                const selectedOpt = hamperSubVarOptions[`${item.productId}-${v.id}`];
                                if (selectedOpt) {
                                  itemParts.push(`${v.name}: ${selectedOpt.value}`);
                                }
                              }
                            });
                          }
                          if (itemParts.length > 0) {
                            hamperSubDetails.push(`${subProduct.name} (${itemParts.join(', ')})`);
                          }
                        }
                      });
                    }

                    if (hamperSubDetails.length > 0) {
                      itemsMsg.push(`Combo Options: [ ${hamperSubDetails.join(' | ')} ]`);
                    }

                    if (product.allowCakeMessage && customCakeMsg.trim()) {
                      itemsMsg.push(`Cake: "${customCakeMsg.trim()}"`);
                    }
                    if (product.allowGiftMessage && customGiftMsg.trim()) {
                      itemsMsg.push(`Card: "${customGiftMsg.trim()}"`);
                    }

                    const finalMsg = itemsMsg.join(' | ') || undefined;
                    const finalImg = product.allowPhotoUpload ? (customImg || undefined) : undefined;

                    const variationsArray = (Object.entries(selectedVarOptions) as [string, { value: string; priceAdjustment: number }][]).map(([vId, opt]) => {
                      const v = product.variations?.find(x => x.id === vId);
                      return {
                        name: v ? v.name : 'Option',
                        value: opt.value,
                        priceAdjustment: opt.priceAdjustment
                      };
                    });

                    // Support multiple quantities
                    for (let q = 0; q < quantity; q++) {
                      // Adjust product price based on selection
                      const netPriceAdjustment = (Object.values(selectedVarOptions) as { value: string; priceAdjustment: number }[]).reduce((acc, opt) => acc + opt.priceAdjustment, 0);
                      const hamperSubAdjustment = product.isHamper 
                        ? (Object.values(hamperSubVarOptions) as { value: string; priceAdjustment: number }[]).reduce((acc, opt) => acc + opt.priceAdjustment, 0)
                        : 0;

                      onAddToCart({
                        ...product,
                        price: (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price ? product.discountPrice : product.price) + netPriceAdjustment + hamperSubAdjustment
                      }, finalMsg, finalImg, variationsArray);
                    }

                    alert(`"${product.name}" added successfully with personalization!`);
                    setQuantity(1);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl tracking-widest shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingBasket className="w-4 h-4" />
                  <span>ADD TO BASKET</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-slate-205 text-slate-400 border border-slate-300 font-extrabold text-xs rounded-xl cursor-not-allowed text-center uppercase"
                >
                  OUT OF STOCK
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

          {/* 10. Product Description */}
          <div className="space-y-2 text-left">
            <h2 className={`font-black text-xs uppercase tracking-widest block font-mono ${
              isLight ? 'text-slate-800' : 'text-slate-300'
            }`}>
              Product Description
            </h2>
            <div className={`p-4 rounded-xl border text-xs leading-relaxed font-sans whitespace-pre-line ${
              isLight ? 'bg-white border-rose-100 text-slate-700' : 'bg-[#050505] border-white/5 text-slate-400'
            }`}>
              {product.description || 'Artisan packaging constructed with organic materials, customized to matching occasions.'}
            </div>
          </div>
          {/* Associated sub-products component for Gifting Combos */}
          {product.isHamper && product.hamperItems && product.hamperItems.length > 0 && (
            <div className="space-y-2.5 text-left">
              <h2 className={`font-black text-xs uppercase tracking-widest block font-mono ${
                isLight ? 'text-slate-800' : 'text-slate-355'
              }`}>
                🎁 Beautifully Included in this Combo
              </h2>
              <div className={`p-4 rounded-xl border space-y-3 divide-y divide-dashed tracking-wide text-xs ${
                isLight 
                  ? 'bg-rose-50/20 border-rose-100/60 divide-rose-100/50 text-slate-700' 
                  : 'bg-[#121212]/50 border-white/5 divide-white/[0.05] text-slate-300'
              }`}>
                {product.hamperItems.map((item, idx) => {
                  const subProduct = state.products.find(p => p.id === item.productId);
                  if (!subProduct) return null;
                  return (
                    <div key={idx} className={`py-3 space-y-2 ${idx === 0 ? 'pt-0 border-none' : 'border-t border-dashed'}`}>
                      <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full font-extrabold flex items-center justify-center font-mono text-[10px] shrink-0 ${
                            isLight ? 'bg-rose-500/10 text-rose-600' : 'bg-pink-500/10 text-pink-400'
                          }`}>
                            {item.quantity}
                          </span>
                          <span className={`font-bold text-xs leading-normal ${
                            isLight ? 'text-slate-800' : 'text-white'
                          }`}>{subProduct.name}</span>
                        </div>
                        {subProduct.description && (
                          <p className={`pl-7 text-[11px] font-medium leading-normal ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {subProduct.description}
                          </p>
                        )}
                      </div>

                      {/* Display preset options or lets customer choose dynamically! */}
                      {subProduct.variations && subProduct.variations.length > 0 && (
                        <div className="pl-7 space-y-2 mt-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[9px] font-extrabold font-mono tracking-wider text-slate-400 uppercase block">Selected Customize Options:</span>
                          {subProduct.variations.map((v) => {
                            const preset = (item.selectedVariations || []).find(sv => sv.name === v.name);
                            if (preset) {
                              return (
                                <div key={v.id} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                  <span className="font-semibold text-slate-500 font-mono">{v.name}:</span>
                                  <span className="font-extrabold text-slate-800 bg-slate-100/10 px-1.5 py-0.5 rounded border border-slate-200">{preset.value}</span>
                                  <span className="text-[9px] text-slate-400 font-mono italic">(Preset Option Included)</span>
                                </div>
                              );
                            } else {
                              // Dynamic: Let Customer Choose!
                              const key = `${subProduct.id}-${v.id}`;
                              const selected = hamperSubVarOptions[key];
                              return (
                                <div key={v.id} className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-505 block">Choose {v.name}:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {v.options.map((opt, oIdx) => {
                                      const isChosen = selected?.value === opt.value;
                                      const isOutOfStock = !product.allowOrderWhenOutOfStock && opt.stock !== undefined && opt.stock <= 0;
                                      return (
                                        <button
                                          type="button"
                                          key={oIdx}
                                          disabled={isOutOfStock}
                                          onClick={() => {
                                            setHamperSubVarOptions({
                                              ...hamperSubVarOptions,
                                              [key]: opt
                                            });
                                          }}
                                          className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-bold transition-all flex items-center gap-1 select-none ${
                                            isChosen 
                                              ? 'bg-amber-500 text-slate-900 border-amber-500 font-extrabold' 
                                              : isOutOfStock
                                              ? 'opacity-40 border-dashed border-slate-300 line-through cursor-not-allowed bg-slate-100 text-slate-400'
                                              : isLight
                                              ? 'bg-white border-slate-205 text-slate-700 hover:bg-slate-50 cursor-pointer'
                                              : 'bg-[#121212] border-white/5 text-slate-300 hover:bg-white/5 cursor-pointer'
                                          }`}
                                        >
                                          <span>{opt.value}</span>
                                          {opt.priceAdjustment !== 0 && (
                                            <span className="text-[9px] font-mono font-black text-rose-600">
                                              ({opt.priceAdjustment > 0 ? `+Rs.${opt.priceAdjustment}` : `-Rs.${Math.abs(opt.priceAdjustment)}`})
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Compliance & Gifting SLA disclaimer */}
          {state.appearance?.giftingSlaDisclaimer && (
            <div className="space-y-2 text-left">
              <h2 className={`font-black text-xs uppercase tracking-widest block font-mono ${
                isLight ? 'text-rose-950' : 'text-rose-350'
              }`}>
                📢 Compliance & Gifting SLA
              </h2>
              <div className={`p-4 rounded-xl border text-xs leading-relaxed font-sans ${
                isLight ? 'bg-amber-50/40 border-amber-205 text-slate-705 shadow-sm' : 'bg-amber-505/[0.03] border-amber-505/15 text-amber-200/90'
              }`}>
                {state.appearance.giftingSlaDisclaimer}
              </div>
            </div>
          )}

          {/* 11. PRODUCT DELIVERY & AVAILABILITY SCHEDULE (Highly Responsive Tables / Stacked View) */}
          {(() => {
            const assignedGroupIds = product.deliveryGroupIds || (product.deliveryGroupId ? [product.deliveryGroupId] : []);
            const assignedGroups = (state.deliveryGroups || []).filter(g => assignedGroupIds.includes(g.id));

            return assignedGroups.length > 0 ? (
              <div className="w-full bg-[#fefece] text-slate-900 border border-yellow-500/80 rounded-xl overflow-hidden shadow-sm font-sans text-left">
                <div className="bg-[#fded52] px-3.5 py-2.5 border-b border-yellow-400 flex items-center justify-between">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5">
                    ⚡ PRODUCT DELIVERY & AVAILABILITY SCHEDULE
                  </span>
                  <span className="text-[9px] bg-slate-900 text-yellow-300 font-bold font-mono px-2 py-0.5 rounded-full whitespace-nowrap">
                    {assignedGroups.length} Location {assignedGroups.length === 1 ? 'Tier' : 'Tiers'}
                  </span>
                </div>

                {/* MOBILE VIEW: Bento Stacked layout */}
                <div className="block sm:hidden divide-y divide-yellow-300/60 bg-[#fffee2]">
                  {assignedGroups.map((group) => (
                    <div key={group.id} className="p-4 space-y-2.5">
                      <div className="flex justify-between items-center bg-yellow-200/50 p-2 rounded border border-yellow-300">
                        <span className="font-black text-slate-900 uppercase tracking-wide text-[10px]">{group.name}</span>
                        <span className="font-bold text-amber-955 bg-yellow-400 px-2.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap">
                          {group.estimatedDeliveryTime || 'Standard SLA'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 font-bold block uppercase text-[8px] tracking-wider mb-0.5">Coverage Area</span>
                          <span className="text-slate-800 font-medium leading-relaxed">{group.coverageArea || 'Contact support'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block uppercase text-[8px] tracking-wider mb-0.5">Fulfillment Method</span>
                          <span className="text-slate-800 font-medium">{group.deliveryMethod || 'Couriers'}</span>
                        </div>
                        <div className="col-span-2 pt-1.5 border-t border-yellow-250 flex justify-between items-center">
                          <span className="text-slate-505 font-bold uppercase text-[8px] tracking-wider">Order Cut-off Time</span>
                          <span className="text-slate-800 font-bold font-mono text-[10px]">{group.cutoffTime || '4:00 PM'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TABLE VIEW: Desktop standard comfortable grid */}
                <div className="hidden sm:block overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse select-none min-w-[500px]">
                    <thead>
                      <tr className="bg-[#fefece] text-[10px] uppercase font-bold text-slate-800 border-b border-yellow-400 font-sans">
                        <th className="p-2.5 border-r border-yellow-300">Delivery Group</th>
                        <th className="p-2.5 border-r border-yellow-300">Coverage Area</th>
                        <th className="p-2.5 border-r border-yellow-300">Delivery Method</th>
                        <th className="p-2.5 border-r border-yellow-300">Estimated Delivery Time</th>
                        <th className="p-2.5">Cut-off Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-yellow-300 bg-[#fffee2] text-slate-850">
                      {assignedGroups.map((group) => (
                        <tr key={group.id} className="hover:bg-yellow-200/40 transition">
                          <td className="p-2.5 border-r border-yellow-300 font-black text-slate-900 leading-tight">
                            {group.name}
                          </td>
                          <td className="p-2.5 border-r border-yellow-300 font-medium text-slate-750 leading-snug">
                            {group.coverageArea || 'Contact Support'}
                          </td>
                          <td className="p-2.5 border-r border-yellow-300 font-medium text-slate-750">
                            {group.deliveryMethod || 'Local Arrangement'}
                          </td>
                          <td className="p-2.5 border-r border-yellow-300 font-bold text-amber-950 font-mono">
                            ⚡ {group.estimatedDeliveryTime || 'N/A'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-800">
                            {group.cutoffTime || '4:00 PM NST'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#fffecd] px-3.5 py-2.5 border-t border-yellow-400 text-[10px] text-slate-650 font-semibold leading-relaxed">
                  * Orders submitted beyond the cut-off times are queued and dispatched on the subsequent fulfillment cycle. All speeds verified by carriers.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-left">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-widest text-[#10b981]">
                  <span>🌐 Standard National Fulfillment</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Nationwide</span>
                </div>
                <p className="text-slate-400 mt-2 text-[11px] leading-relaxed">
                  Standard same-day or next-day shipping available within Kathmandu Valley. Nationwide outstation delivery typically routes within 2-5 days.
                </p>
              </div>
            );
          })()}

          {/* 12. Compliance requirement (short informative) */}
          <div className={`p-4 rounded-xl border text-[10.5px] leading-relaxed text-left space-y-1 ${
            isLight ? 'bg-rose-500/5 border-rose-500/10 text-rose-800/80' : 'bg-rose-500/5 border-rose-500/10 text-rose-300'
          }`}>
            <strong className="block text-[9px] uppercase tracking-wide font-black font-mono">
              📢 Compliance & Gifting SLA disclaimer
            </strong>
            <p>
              Handcrafted flora arrangements, freshly-baked dessert items, and bespoke gift combinations require immediate scheduling and florist coordination upon payment confirmation. Due to the fresh and perishable nature of customized cakes and flowers, orders once compiled cannot compile cancellation or arbitrary exchanges. Please coordinate your preferred address locations.
            </p>
          </div>

          {/* 13. Urgent support number */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between text-left gap-4 bg-[#25D366]/5 ${
            isLight ? 'border-[#25D366]/20' : 'border-[#25D366]/20'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#25D366] font-mono block">
                💬 WhatsApp Emergency Help & Customization
              </span>
              <p className={`text-[11px] font-semibold leading-normal ${isLight ? 'text-slate-700' : 'text-slate-350'}`}>
                Require immediate updates, custom note adjustments, or fast delivery coordination? Chat with our team instantly!
              </p>
            </div>
            <a
              href={(() => {
                const phone = state.store?.supportPhone || '9851082531';
                const clean = phone.replace(/[^\d]/g, '');
                if (clean.length === 10 && clean.startsWith('9')) {
                  return `https://wa.me/977${clean}`;
                }
                return `https://wa.me/${clean}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs font-mono rounded-lg transition tracking-wide text-center shrink-0 uppercase shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 w-full sm:w-auto border-0 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.022-.008-.115-.062-.24-.125-.214-.1-.854-.42-1.002-.472-.148-.052-.255-.08-.363.08-.11.16-.425.534-.51.63-.086.096-.17.108-.344.008-.174-.088-.736-.27-1.402-.365-.518-.073-.865-.163-1.04-.19-.174-.025-.264-.047-.356.09-.092.137-.417.534-.51.63-.093.096-.184.108-.358.008a12.06 12.06 0 0 1-2.206-1.362A11.45 11.45 0 0 1 8.548 11.15a.35.35 0 0 1 .129-.32c.118-.113.255-.3.385-.45.079-.09.124-.15.176-.25.052-.1.026-.19-.013-.265-.04-.075-.362-.872-.497-1.196-.13-.314-.26-.27-.356-.275-.08-.003-.177-.003-.274-.003-.096 0-.256.036-.39.182-.134.148-.512.5-.512 1.218s.524 1.412.597 1.51c.073.1 1.03 1.573 2.5 2.204.35.15.622.24.835.308.35.11.668.095.918.058.28-.04 1.436-.587 1.636-1.153a2.03 2.03 0 0 0 .142-.516c.007-.09-.003-.16-.01-.2-.007-.04-.023-.08-.113-.125zM12 2a10 10 0 0 0-8.584 15.116L2 22l5.034-1.32A9.972 9.972 0 0 0 12 22a10 10 0 0 0 10-10C22 6.477 17.522 2 12 2zm0 18.06h-.002c-1.63 0-3.23-.44-4.63-1.27l-.33-.2-.2.05-3.32.87.89-3.24-.22-.35A8.046 8.046 0 0 1 3.94 12c0-4.44 3.61-8.06 8.06-8.06s8.06 3.62 8.06 8.06c0 4.45-3.62 8.06-8.06 8.06z"/>
              </svg>
              WHATSAPP CHAT
            </a>
          </div>

          {/* 14. Product Review Submissions & Published Comments */}
          <div className="space-y-4 pt-4 border-t border-rose-100/30 text-left">
            <span className={`text-[10px] font-bold uppercase tracking-widest block font-mono ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Customer Review Hub ({reviewsList.length})
            </span>
            
            <div className="space-y-2.5 max-h-48 overflow-y-auto pb-1 select-none">
              {reviewsList.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No client reviews published for this item yet.</p>
              ) : (
                reviewsList.map(r => (
                  <div key={r.id} className={`p-3 border rounded-xl space-y-1.5 text-xs ${
                    isLight ? 'bg-white border-rose-100 text-slate-800' : 'bg-black/30 border-white/5 text-slate-300'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{r.customerName}</span>
                      <div className="flex text-amber-400 gap-0.5 font-mono">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-2.5 h-2.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                        ))}
                      </div>
                    </div>
                    <p className={`font-sans leading-relaxed text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      "{r.comment}"
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className={`p-3.5 rounded-xl border text-center ${
              isLight ? 'bg-rose-50/20 border-rose-100 text-slate-500' : 'bg-black/20 border-white/5 text-slate-400'
            }`}>
              <p className="text-xs font-medium font-sans">
                ✍️ Review submissions are unlocked after your order is successfully delivered to the receiver!
              </p>
            </div>
          </div>

          {/* Automatic Recommendations "You May Also Like" */}
          {recommendedProducts.length > 0 && (
            <div className="space-y-3 pt-5 border-t border-[#f5b3cb]/30 text-left">
              <div className="flex justify-between items-center">
                <span className={`text-[11px] font-black uppercase tracking-widest block font-mono ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}>
                  💖 You May Also Like (Recommended Complements)
                </span>
                <span className="text-[10px] text-rose-600 font-extrabold font-mono uppercase">Special Add-on</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Automatic smart matching based on pricing and category combinations:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recommendedProducts.map(rec => {
                  const recPrice = rec.price * currencyRate;
                  const recDiscountConverted = rec.discountPrice ? rec.discountPrice * currencyRate : undefined;
                  const finalPriceToShow = recDiscountConverted && recDiscountConverted < recPrice ? recDiscountConverted : recPrice;
                  
                  return (
                    <div 
                      key={rec.id} 
                      className={`p-2.5 rounded-xl border flex gap-3.5 items-center justify-between text-xs transition-all hover:border-rose-300 shadow-3xs hover:shadow-2xs select-none ${
                        isLight 
                          ? 'bg-rose-50/20 border-rose-100/60 text-slate-800 hover:bg-rose-50/45' 
                          : 'bg-[#0f0f0f] border-white/5 text-slate-300'
                      }`}
                    >
                      <div 
                        onClick={() => setActiveProductId(rec.id)} 
                        className="flex gap-2.5 items-center cursor-pointer flex-1 min-w-0"
                        title="Click to view full customizable options"
                      >
                        <img 
                          src={cleanImageUrl(rec.images?.[0])}
                          alt={rec.name}
                          className="w-11 h-11 object-cover rounded-lg border border-slate-200/50 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = fallbackProductImage;
                          }}
                        />
                        <div className="min-w-0 leading-tight">
                          <h4 className="font-bold truncate text-[11.5px] hover:text-[#E91E63] transition">{rec.name}</h4>
                          <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-0.5">
                            {selectedCurrency.symbol}{Math.round(finalPriceToShow)}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(rec);
                          alert(`"${rec.name}" added directly to basket!`);
                        }}
                        className="p-1.5 px-3 bg-[#E91E63] hover:bg-[#C2185B] text-white text-[9.5px] uppercase font-black tracking-widest rounded-lg transition-all transform active:scale-95 cursor-pointer border-0 shadow-3xs"
                      >
                        + Basket
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Long Description */}
          {product.longDescription && (
            <div className="space-y-2 pt-5 border-t border-[#f5b3cb]/30 text-left">
              <h2 className={`font-black text-xs uppercase tracking-widest block font-mono ${
                isLight ? 'text-slate-800' : 'text-slate-300'
              }`}>
                📜 Product Long Description
              </h2>
              <div className={`p-4 rounded-xl border text-xs leading-relaxed font-sans whitespace-pre-wrap ${
                isLight ? 'bg-rose-50/10 border-rose-100/40 text-slate-705 font-medium' : 'bg-[#050505] border-white/5 text-slate-400'
              }`}>
                {product.longDescription}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
