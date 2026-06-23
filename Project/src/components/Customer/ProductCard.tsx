import React from 'react';
import { Product, CurrencySettings, DeliveryGroup } from '../../types';
import { ShoppingBasket, Sparkles } from 'lucide-react';
import { getProductStock, isProductOutOfStockForCustomer, isProductLowStockForCustomer } from '../../utils/stockUtils';

interface ProductCardProps {
  key?: any;
  product: Product;
  selectedCurrency: CurrencySettings;
  deliveryGroups?: DeliveryGroup[];
  onViewDetails: (productId: string) => void;
  onAddToCart: (product: Product, e: React.MouseEvent) => void;
  allProducts?: Product[];
}

export default function ProductCard({
  product,
  selectedCurrency,
  deliveryGroups,
  onViewDetails,
  onAddToCart,
  allProducts
}: ProductCardProps) {
  
  // Convert standard NPR to swapped currency
  const hasDiscount = product.discountPrice !== undefined && product.discountPrice > 0 && product.discountPrice < product.price;
  const originalPriceConverted = product.price * (selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR);
  const convertedPrice = (hasDiscount ? product.discountPrice! : product.price) * (selectedCurrency.code === 'NPR' ? 1 : selectedCurrency.rateToNPR);
  const discountPercent = hasDiscount ? Math.round(((product.price - product.discountPrice!) / product.price) * 100) : 0;

  const isOutOfStock = isProductOutOfStockForCustomer(product, allProducts);
  const actualStock = getProductStock(product, allProducts);
  const isLowStock = isProductLowStockForCustomer(product, allProducts);

  const subProducts = product.isHamper && product.hamperItems && allProducts
    ? product.hamperItems
        .map(item => allProducts.find(p => p.id === item.productId))
        .filter((p): p is Product => !!p && p.status !== 'deleted')
    : [];

  return (
    <div 
      onClick={() => onViewDetails(product.id)}
      className="group bg-white border border-[rgba(var(--primary-rgb),0.12)] rounded-2xl overflow-hidden hover:border-[var(--primary-theme)] hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full cursor-pointer relative"
    >
      <div>
        {/* Aspect Photo */}
        <div className="relative aspect-square overflow-hidden bg-[rgba(var(--primary-rgb),0.02)]">
          <img 
            src={(product.images && product.images[0]) || 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'} 
            alt={`${product.name} - Handwrapped Premium Gift delivered in Kathmandu, Nepal`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-100"
            referrerPolicy="no-referrer"
          />

          {/* Combo Subproducts visual compilation inside images */}
          {product.isHamper && subProducts.length > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center -space-x-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-[rgba(var(--primary-rgb),0.08)] z-10 hover:space-x-0.5 transition-all duration-300">
              {subProducts.slice(0, 3).map((sub, sIdx) => (
                <div key={`${sub.id}-${sIdx}`} className="relative group/tooltip">
                  <img
                    src={sub.images?.[0] || 'https://images.unsplash.com/photo-154946?q=80&w=150&auto=format&fit=crop'}
                    alt={sub.name}
                    className="w-6.5 h-6.5 object-cover rounded-lg border border-white shadow-xs block shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-slate-900/95 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                    {sub.name}
                  </span>
                </div>
              ))}
              {subProducts.length > 3 && (
                <div className="w-6.5 h-6.5 bg-[var(--primary-theme)] text-white text-[8px] font-black flex items-center justify-center rounded-lg border border-white shadow-xs shrink-0 z-10 select-none">
                  +{subProducts.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Combo Hamper Badge */}
          {product.isHamper && (
            <span className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs border border-[rgba(var(--primary-rgb),0.12)] text-[var(--primary-theme)] font-extrabold text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1 z-10">
              <Sparkles className="w-2.5 h-2.5 text-[var(--primary-theme)] fill-[var(--primary-theme)]" /> Combo Gift
            </span>
          )}

          {/* Discount Percentage Badge */}
          {hasDiscount && !isOutOfStock && (
            <span className="absolute top-2.5 right-2.5 bg-[var(--primary-theme)] text-white font-extrabold text-[8.5px] uppercase tracking-wider px-2 py-0.5 rounded shadow-sm z-10 font-mono">
              {discountPercent}% OFF
            </span>
          )}

          {/* Out of Stock Trigger */}
          {isOutOfStock ? (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex items-center justify-center z-10">
              <span className="bg-slate-100 border border-slate-200 text-slate-705 font-bold text-[9px] uppercase px-2.5 py-1 rounded-md tracking-wider">Out of Stock</span>
            </div>
          ) : isLowStock ? (
            <span className="absolute bottom-2.5 left-2.5 bg-amber-500 text-slate-950 font-bold text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded shadow-sm font-mono z-10">
              Only {actualStock} left
            </span>
          ) : null}
        </div>

        {/* Content detail */}
        <div className="p-3 pb-1 space-y-1 text-left">
          <h4 className="font-serif italic text-[14px] sm:text-[15px] text-slate-800 font-extrabold line-clamp-1 group-hover:text-[var(--primary-theme)] transition-colors leading-snug">
            {product.name}
          </h4>
        </div>
      </div>

      <div className="p-3 pt-0 flex items-center justify-between mt-1">
        <div className="flex flex-col text-left">
          {hasDiscount && (
            <span className="font-mono text-[9px] sm:text-[10px] line-through text-slate-400 font-bold leading-none mb-0.5">
              {selectedCurrency.symbol} {originalPriceConverted.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
          )}
          <div className="font-mono text-[13.5px] sm:text-[15px] font-black text-[var(--primary-theme)] leading-none">
            {selectedCurrency.symbol} {convertedPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
          </div>
        </div>

        {!isOutOfStock ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, e);
            }}
            className="px-2 py-1.5 bg-[rgba(var(--primary-rgb),0.04)] hover:bg-[var(--primary-theme)] text-[var(--primary-theme)] hover:text-white text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 border border-[rgba(var(--primary-rgb),0.08)] flex items-center gap-1 cursor-pointer font-sans"
          >
            <ShoppingBasket className="w-3 h-3" />
            <span>+ Basket</span>
          </button>
        ) : (
          <span className="text-slate-400 text-[10px] font-bold py-1 px-2 uppercase tracking-wider">Sold Out</span>
        )}
      </div>

    </div>
  );
}
