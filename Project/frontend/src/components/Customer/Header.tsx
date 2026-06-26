import React, { useState, useMemo } from 'react';
import { DatabaseState, CurrencySettings } from '../../types';
import { ShoppingCart, LogOut, ChevronDown, Menu, X, ChevronRight, Coins, User, Search, Sparkles } from 'lucide-react';

interface HeaderProps {
  state: DatabaseState;
  selectedCurrency: CurrencySettings;
  onSelectCurrency: (curr: CurrencySettings) => void;
  cartCount: number;
  onOpenCart: () => void;
  onNavigateToSlug: (slug: string) => void;
  onSelectCategory?: (catId: string) => void;
  currentSlug: string;
  onOpenPortal: (tab?: 'track' | 'signin' | 'reminder') => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  customerUser?: { email: string; name: string } | null;
  onLogoutCustomer?: () => void;
}

export default function Header({
  state,
  selectedCurrency,
  onSelectCurrency,
  cartCount,
  onOpenCart,
  onNavigateToSlug,
  onSelectCategory,
  currentSlug,
  onOpenPortal,
  searchQuery,
  onSearchChange,
  customerUser,
  onLogoutCustomer
}: HeaderProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchBarOpen, setIsSearchBarOpen] = useState(false);
  
  // Dynamic navbar links - managed from Gifting Touch Admin Page Builder
  // If navLinks is empty, we populate on-the-fly with standard links to categories in state.categories
  const cleanedNavLinks = useMemo(() => {
    const rawLinks = state.appearance.navbarLinks || [];
    if (rawLinks.length > 0) {
      return rawLinks.map((link, idx) => ({
        id: link.id || `nav-item-${idx}-${Date.now()}`,
        title: link.title,
        url: link.url,
        type: link.type || 'custom',
        categoryId: link.categoryId,
        parentMenuId: link.parentMenuId || 'main',
        sequence: typeof link.sequence === 'number' ? link.sequence : idx + 1,
        enabled: link.enabled !== false,
      }));
    }
    
    // Otherwise fallback-generate from physical category nodes and static links for full convenience!
    const fallbackList: any[] = [];
    let seq = 1;
    
    // 1. Pages/Home links
    fallbackList.push({
      id: 'default-home',
      title: 'Home',
      url: '/home',
      type: 'custom',
      parentMenuId: 'main',
      sequence: seq++,
      enabled: true
    });
    
    // 2. Categories — or gift-shop defaults like reference
    if ((state.categories || []).length > 0) {
      (state.categories || []).forEach(cat => {
        fallbackList.push({
          id: `default-${cat.id}`,
          title: cat.name,
          url: `/category/${cat.slug}`,
          type: 'category',
          categoryId: cat.id,
          parentMenuId: 'main',
          sequence: seq++,
          enabled: true
        });
      });
    } else {
      ['Shrawan Gifts', 'Birthday Gifts', 'Anniversary Gifts', 'Cake Delivery', 'Flower Delivery', 'Gift Hampers'].forEach((name, i) => {
        fallbackList.push({
          id: `default-gift-${i}`,
          title: name,
          url: '/catalog',
          type: 'custom',
          parentMenuId: 'main',
          sequence: seq++,
          enabled: true
        });
      });
    }

    // 3. Simple About link
    fallbackList.push({
      id: 'default-about',
      title: 'About Us',
      url: '/page/about',
      type: 'page',
      parentMenuId: 'main',
      sequence: seq++,
      enabled: true
    });

    // 4. AI Blog Writer Link
    fallbackList.push({
      id: 'default-blog',
      title: 'Blogs & Guides',
      url: '/blog',
      type: 'custom',
      parentMenuId: 'main',
      sequence: seq++,
      enabled: true
    });

    return fallbackList;
  }, [state.appearance.navbarLinks, state.categories]);

  // Top Level main menu items: parentMenuId is 'main' and enabled is true
  const topLevelMenus = useMemo(() => {
    return cleanedNavLinks
      .filter(l => (l.parentMenuId === 'main' || !l.parentMenuId) && l.enabled !== false)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }, [cleanedNavLinks]);

  // Get children submenu list for a parent node
  const getChildrenForMenu = (parentId: string) => {
    return cleanedNavLinks
      .filter(l => l.parentMenuId === parentId && l.enabled !== false)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  };

  // Helper to match category from customized links
  const getCategoryFromUrl = (url: string) => {
    const catMatch = url.match(/(?:\/|^)category\/([^/]+)/);
    if (catMatch) {
      const catSlugOrId = catMatch[1];
      const foundCat = (state.categories || []).find(
        c => c.slug === catSlugOrId || c.id === catSlugOrId
      );
      return foundCat || null;
    }
    return null;
  };

  // Unified dynamic click router
  const handleLinkClick = (title: string, url: string, categoryId?: string) => {
    if (categoryId) {
      onSelectCategory?.(categoryId);
      return;
    }

    if (url === '/' || url === '' || url.toLowerCase() === 'home') {
      onNavigateToSlug('home');
      onSelectCategory?.('');
      return;
    }

    const resolvedCat = getCategoryFromUrl(url);
    if (resolvedCat) {
      onSelectCategory?.(resolvedCat.id);
      return;
    }

    const linkSlug = url.startsWith('/') ? url.slice(1) : url;
    const cleanSlug = linkSlug.replace('page/', '');
    if (url.startsWith('/') || url.startsWith('page/') || !url.includes('://')) {
      onNavigateToSlug(cleanSlug);
    } else {
      window.open(url, '_blank');
    }
  };

  const primaryCol = state.appearance?.primaryColor || '#E91E63';
  const secondaryCol = state.appearance?.secondaryColor || '#C2185B';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-pink-100/60">
      {/* Purple announcement bar — like reference top strip */}
      {state.appearance?.stickyNotice && (
        <div
          className="text-white text-center py-2.5 px-4 text-[11px] sm:text-xs font-semibold tracking-wide"
          style={{ backgroundColor: primaryCol }}
        >
          {state.appearance.stickyNotice}
        </div>
      )}

      {/* Top row: Search | Logo | Cart */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-row items-center justify-between gap-3">
          
          {/* Left: Search */}
          <div className="flex items-center shrink-0 w-20 sm:w-24">
            <button
              onClick={() => setIsSearchBarOpen(!isSearchBarOpen)}
              className="p-2 rounded-full text-slate-700 hover:bg-pink-50 transition cursor-pointer"
              style={{ color: isSearchBarOpen ? primaryCol : undefined }}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex items-center justify-center flex-1 min-w-0">
            <button
              onClick={() => onNavigateToSlug('home')}
              className="flex flex-col items-center cursor-pointer group hover:opacity-90 transition focus:outline-none"
              aria-label="Home"
            >
              {state.appearance?.siteLogo ? (
                <img
                  src={state.appearance.siteLogo}
                  alt={state.store?.storeName || 'Koseli Xpress'}
                  className="h-10 sm:h-14 w-auto object-contain max-w-[200px]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <span className="font-script text-3xl sm:text-4xl font-bold leading-none" style={{ color: secondaryCol }}>
                    Koseli
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase mt-0.5" style={{ color: primaryCol }}>
                    Xpress
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Right: Cart + account */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 w-20 sm:w-auto">
            <button
              onClick={onOpenCart}
              className="relative p-2 text-slate-700 hover:bg-pink-50 rounded-full transition cursor-pointer"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 text-white font-bold text-[9px] rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ backgroundColor: secondaryCol }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {!customerUser ? (
              <button
                onClick={() => onOpenPortal('signin')}
                className="hidden sm:flex p-2 text-slate-600 hover:text-[#E91E63] transition cursor-pointer"
                title="Sign in"
              >
                <User className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => onOpenPortal('signin')}
                className="hidden sm:flex w-8 h-8 rounded-full text-white text-xs font-bold items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${primaryCol}, ${secondaryCol})` }}
              >
                {customerUser.name.charAt(0).toUpperCase()}
              </button>
            )}

            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 text-slate-700 md:hidden cursor-pointer"
              aria-label="Menu"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanding Search Bar Panel */}
      {isSearchBarOpen && (
        <div className="bg-pink-50/80 border-b border-pink-100 p-2.5 px-4 flex items-center gap-3 animate-fade-in z-40 relative">
          <div className="relative flex-1 max-w-lg mx-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search flowers, cakes, gift hampers..."
              className="w-full pl-9 pr-8 py-2.5 text-xs bg-white border border-pink-200 rounded-full text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder-slate-400"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => onSearchChange?.('')} 
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button 
            type="button"
            onClick={() => {
              setIsSearchBarOpen(false);
              onSearchChange?.('');
            }}
            className="text-slate-500 hover:text-[#E91E63] text-xs font-semibold cursor-pointer border-0 bg-transparent"
          >
            Cancel
          </button>
        </div>
      )}      {/* Category navigation — reference style */}
      <div className="hidden md:block border-t border-pink-100/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center justify-center flex-wrap gap-x-6 lg:gap-x-10 gap-y-2 text-[13px] font-semibold text-slate-700">
            {topLevelMenus.filter(l => l.id !== 'default-home').map((link) => {
              const children = getChildrenForMenu(link.id);
              const hasSubs = children.length > 0;

              if (hasSubs) {
                return (
                  <div key={`hier-dropdown-${link.id}`} className="relative group py-1">
                    <button
                      onClick={() => handleLinkClick(link.title, link.url, link.categoryId)}
                      className="flex items-center gap-1 hover:text-[#E91E63] transition cursor-pointer font-semibold text-[13px] border-0 bg-transparent py-1 focus:outline-none"
                    >
                      <span>{link.title}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E91E63] transition" />
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-pink-100 shadow-xl hidden group-hover:block w-52 overflow-hidden z-50 p-2 rounded-xl">
                      <div className="px-2.5 py-1.5 text-[9px] uppercase font-bold tracking-widest border-b border-pink-50 mb-1.5" style={{ color: primaryCol }}>
                        {link.title}
                      </div>
                      <button
                        onClick={() => handleLinkClick(link.title, link.url, link.categoryId)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-pink-50 rounded-lg text-slate-800 text-[12px] font-semibold transition block cursor-pointer border-0 bg-transparent"
                      >
                        All {link.title}
                      </button>
                      {children.map((subLink) => (
                        <button
                          key={`hier-sub-${subLink.id}`}
                          onClick={() => handleLinkClick(subLink.title, subLink.url, subLink.categoryId)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-pink-50 rounded-lg text-slate-600 text-[12px] transition block cursor-pointer border-0 bg-transparent"
                        >
                          {subLink.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={`hier-btn-${link.id}`}
                  onClick={() => handleLinkClick(link.title, link.url, link.categoryId)}
                  className="flex items-center gap-1 hover:text-[#E91E63] transition cursor-pointer font-semibold text-[13px] border-0 bg-transparent py-1 focus:outline-none"
                >
                  {link.title}
                  <ChevronDown className="w-3 h-3 text-slate-400 opacity-60" />
                </button>
              );
            })}

            {/* Currency — end of nav */}
            <div className="relative group ml-2 pl-4 border-l border-pink-100">
              <button type="button" className="flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-[#E91E63] cursor-pointer border-0 bg-transparent">
                <Coins className="w-3.5 h-3.5" />
                {selectedCurrency.code}
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-pink-100 rounded-lg shadow-xl hidden group-hover:block w-32 overflow-hidden z-40">
                {state.currencies.map(curr => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => onSelectCurrency(curr)}
                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-pink-50 text-[11px] font-semibold transition block cursor-pointer border-0 bg-transparent"
                  >
                    {curr.code} ({curr.symbol})
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu Tray in Light styling */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white divide-y divide-slate-100 animate-in slide-in-from-top duration-200 shadow-xl relative z-50 text-left">
          
          {/* Quick links */}
          <div className="p-4 space-y-2">
            <span className="text-[9px] font-mono tracking-widest font-extrabold uppercase block mb-1" style={{ color: primaryCol }}>Quick Links</span>
            
            {/* Track Order Button on Mobile (visible) */}
            <button
              onClick={() => {
                onOpenPortal();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg text-xs font-semibold border border-slate-150 text-slate-705 bg-slate-50 hover:bg-slate-100"
            >
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-500" />
                Track Order
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Dynamic unified customized navigation links */}
            <button
              onClick={() => {
                onSelectCategory?.('');
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg text-xs font-semibold border bg-transparent text-slate-705 hover:bg-slate-50 border-transparent"
            >
              <span>All Catalog List</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {topLevelMenus.map((link) => {
              const children = getChildrenForMenu(link.id);
              const hasSubs = children.length > 0;
              const isActive = link.url && (currentSlug === link.url.replace('page/', '').replace(/^\//, ''));

              return (
                <div key={`mobile-hier-${link.id}`} className="space-y-1">
                  <button
                    onClick={() => {
                      if (!hasSubs) {
                        handleLinkClick(link.title, link.url, link.categoryId);
                        setIsMobileOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between text-left py-2 px-3 rounded-lg text-xs font-semibold border bg-transparent ${isActive ? 'bg-rose-50 text-rose-600 border-rose-100/50' : 'text-slate-755 hover:bg-slate-50 border-transparent'}`}
                  >
                    <span className="font-bold">{link.title}</span>
                    {hasSubs ? (
                      <span className="text-[10px] text-slate-400 font-medium">Dropdown ↓</span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {hasSubs && (
                    <div className="pl-4 border-l border-slate-100 ml-3 space-y-1 py-1">
                      <button
                        onClick={() => {
                          handleLinkClick(link.title, link.url, link.categoryId);
                          setIsMobileOpen(false);
                        }}
                        className="w-full text-left py-1.5 px-3 text-[11px] font-bold text-slate-700 hover:text-rose-650 block bg-transparent border-0"
                      >
                        All {link.title}
                      </button>
                      {children.map((subLink) => (
                        <button
                          key={`mobile-sub-${subLink.id}`}
                          onClick={() => {
                            handleLinkClick(subLink.title, subLink.url, subLink.categoryId);
                            setIsMobileOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-3 text-[11px] font-semibold text-slate-500 hover:text-[#E91E63] block bg-transparent border-0"
                        >
                          ↳ {subLink.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Currency Switcher on Mobile Drawer */}
          <div className="p-4 flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest font-extrabold uppercase" style={{ color: secondaryCol }}>Currency</span>
            <div className="flex gap-1.5">
              {state.currencies.map(curr => (
                <button
                  key={`mobile-curr-${curr.code}`}
                  onClick={() => {
                    onSelectCurrency(curr);
                    setIsMobileOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition border-0 ${selectedCurrency.code === curr.code ? 'text-white shadow-sm font-extrabold' : 'bg-slate-100 text-slate-705'}`}
                  style={{ backgroundColor: selectedCurrency.code === curr.code ? primaryCol : undefined }}
                >
                  {curr.code} ({curr.symbol})
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </header>
  );
}
