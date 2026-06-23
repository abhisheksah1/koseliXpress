import React, { useState, useMemo } from 'react';
import { DatabaseState, CurrencySettings } from '../../types';
import { ShoppingCart, LogIn, LogOut, ChevronDown, Menu, X, ChevronRight, Coins, User, Search, Sparkles } from 'lucide-react';

interface HeaderProps {
  state: DatabaseState;
  selectedCurrency: CurrencySettings;
  onSelectCurrency: (curr: CurrencySettings) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
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
  onOpenAdmin,
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
    
    // 2. Categories
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

  const primaryCol = state.appearance?.primaryColor || '#d11252';
  const secondaryCol = state.appearance?.secondaryColor || '#492583';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Notice Bar */}
      {state.appearance?.stickyNotice && (
        <div 
          className="text-white text-center py-2 px-4 text-xs font-extrabold tracking-wider select-none flex items-center justify-center gap-1.5 border-b shadow-md"
          style={{ backgroundImage: `linear-gradient(to right, ${primaryCol}, ${secondaryCol})`, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <span className="inline-block animate-pulse text-white">●</span>
          <span>{state.appearance.stickyNotice}</span>
        </div>
      )}      {/* Top Utility Area: Currency | LOGO | Cart, Track, Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Left Position: Currency Selector */}
          <div className="flex items-center justify-start shrink-0">
            <div className="relative group">
              <button 
                type="button" 
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60 rounded-lg cursor-pointer transition text-[10px] sm:text-xs font-semibold shadow-2xs"
              >
                <Coins className="w-3 sm:w-3.5 h-3 sm:h-3.5" style={{ color: primaryCol }} />
                <span className="font-mono text-[9px] sm:text-[10.5px] font-extrabold tracking-wide">{selectedCurrency.code} ({selectedCurrency.symbol})</span>
                <ChevronDown className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-slate-400" />
              </button>
              
              <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block w-32 sm:w-36 overflow-hidden z-40">
                {state.currencies.map(curr => (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => onSelectCurrency(curr)}
                    className="w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 text-slate-700 hover:bg-slate-50 font-semibold font-sans text-[10px] sm:text-[11px] transition block cursor-pointer border-0 bg-transparent"
                    style={{ '--hover-text': primaryCol } as React.CSSProperties}
                  >
                    {curr.code} ({curr.symbol})
                  </button>
                ))}
              </div>
            </div>
          </div>
 
          {/* Center Position: Website Logo (Primary Home Navigation Anchor) */}
          <div className="flex items-center justify-center flex-1 min-w-0 px-1 sm:px-4">
            <button
              onClick={() => {
                onNavigateToSlug('home');
              }}
              className="flex items-center gap-1 sm:gap-2 md:gap-3 cursor-pointer group hover:opacity-90 transition focus:outline-none max-w-full"
              aria-label="Redirect to Homepage"
              id="header-center-logo-btn"
            >
              {state.appearance?.siteLogo ? (
                <img
                  src={state.appearance.siteLogo}
                  alt={state.store?.storeName || 'Koseli Xpress'}
                  className="h-8 sm:h-12 w-auto object-contain max-w-[90px] min-w-[70px] sm:max-w-[180px] rounded"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <div 
                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-sm rotate-45 flex items-center justify-center text-white font-serif italic font-bold text-sm sm:text-lg group-hover:scale-105 transition-transform shrink-0"
                    style={{ backgroundImage: `linear-gradient(to tr, ${primaryCol}, ${secondaryCol})` }}
                  >
                    <span className="-rotate-45 block">K</span>
                  </div>
                  <div className="text-left font-serif leading-none min-w-0">
                    <span className="text-xs sm:text-sm font-black tracking-widest block uppercase truncate" style={{ color: primaryCol }}>KOSELI</span>
                    <span className="text-[7.5px] sm:text-[9px] font-bold uppercase tracking-widest block font-mono mt-0.5 truncate" style={{ color: `${secondaryCol}e6` }}>Xpress Nepal</span>
                  </div>
                </>
              )}
            </button>
          </div>
 
          {/* Right Position: Cart | Track Order | Search */}
          <div className="flex items-center justify-end gap-1 sm:gap-3 shrink-0">
            
            {/* Search Icon button */}
            <button
              onClick={() => setIsSearchBarOpen(!isSearchBarOpen)}
              className={`p-2 rounded-full cursor-pointer transition ${isSearchBarOpen ? 'bg-slate-100' : 'text-slate-600 hover:bg-slate-50'}`}
              style={{ color: isSearchBarOpen ? primaryCol : undefined }}
              title="Search Shop Catalog"
              aria-label="Search"
              id="header-search-icon-btn"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Shopping Cart Icon with badge count */}
            <button
              onClick={onOpenCart}
              className="relative p-2 text-slate-600 hover:bg-slate-50 transition rounded-full cursor-pointer"
              title="View Shopping Bag"
              aria-label="View Cart"
              id="header-cart-icon-btn"
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              {cartCount > 0 && (
                <span 
                  className="absolute -top-0.5 -right-0.5 text-white font-extrabold font-mono text-[9px] rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: primaryCol }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Login with Google Navigation Indicator / Action */}
            {!customerUser ? (
              <button
                onClick={() => onOpenPortal('signin')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-55 shadow-2xs hover:shadow-xs"
                title="Login to check order history"
                id="header-google-navbar-login-btn"
              >
                <User className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="hidden leading-none sm:inline text-slate-700">Sign In</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 py-1 pl-1.5 pr-1 rounded-lg text-xs font-bold leading-none animate-fade-in shadow-2xs">
                {/* Google Profile Thumbnail */}
                <div className="relative shrink-0">
                  <div className="w-5.5 h-5.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black border border-white shadow-xs">
                    {customerUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 block w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white"></span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPortal('signin')}
                  className="text-[10px] text-slate-700 hover:text-[#d11252] truncate max-w-[80px] hidden sm:inline ml-1 font-bold text-left cursor-pointer border-0 bg-transparent p-0"
                  title={`Email sync: ${customerUser.email}`}
                >
                  {customerUser.name.split(' ')[0]}
                </button>
                <button
                  type="button"
                  onClick={onLogoutCustomer}
                  className="p-0.5 ml-1.5 text-slate-400 hover:text-red-650 transition cursor-pointer border-0 bg-transparent"
                  title="Sign Out of Customer Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick-action Track Order Button */}
            <button
              onClick={() => onOpenPortal('track')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer border focus:outline-none"
              style={{ 
                backgroundColor: `${secondaryCol}0d`, 
                borderColor: `${secondaryCol}1a`,
                color: secondaryCol 
              }}
              title="Track Order Status"
              id="header-track-order-btn"
            >
              <User className="w-3.5 h-3.5" style={{ color: primaryCol }} />
              <span className="leading-none">Track Order</span>
            </button>

            {/* Quick-action Family Reminders Button */}
            <button
              onClick={() => onOpenPortal('reminder')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer border focus:outline-none"
              style={{ 
                backgroundColor: `#a855f70d`, 
                borderColor: `#a855f720`,
                color: '#a855f7' 
              }}
              title="Save Family Reminders"
              id="header-family-reminders-btn"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: '#a855f7' }} />
              <span className="leading-none">📅 Gifting Reminders</span>
            </button>

            {/* Administrative console entry point button */}
            <button
              onClick={onOpenAdmin}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition text-xs cursor-pointer text-white hover:opacity-90 shadow-2xs focus:outline-none"
              style={{ backgroundImage: `linear-gradient(to tr, ${primaryCol}, ${secondaryCol})` }}
              title="Open Admin Board"
              id="header-admin-console-btn"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Admin Board</span>
            </button>

            {/* Mobile menu hamburger toggle button */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-1.5 text-slate-600 hover:text-rose-600 md:hidden transition cursor-pointer"
              aria-label="Toggle navigation menu"
              id="header-mobile-menu-toggle-btn"
            >
              {isMobileOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
            </button>

          </div>

        </div>
      </div>

      {/* Expanding Search Bar Panel */}
      {isSearchBarOpen && (
        <div className="bg-slate-50 border-b border-slate-200/50 p-2.5 px-4 flex items-center gap-3 animate-fade-in z-40 relative">
          <div className="relative flex-1 max-w-lg mx-auto">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="w-4 h-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search for gift hampers, flowers, premium gourmet cakes..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:border-[#d11252] placeholder-slate-400"
              style={{ '--tw-ring-color': primaryCol } as React.CSSProperties}
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
            className="text-slate-500 hover:text-rose-600 text-xs font-semibold cursor-pointer border-0 bg-transparent"
          >
            Cancel
          </button>
        </div>
      )}      {/* Bottom Row / Main Navigation Menu (no dark backgrounds) */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-3.5 border-t border-slate-100">
        <nav className="flex items-center justify-center flex-wrap gap-x-8 gap-y-2 text-xs font-bold text-slate-600">
          
          {/* Note: Standard Home button is REMOVED per Requirement 1. Logo serves as home anchor. */}

          {/* Unified Hierarchical Header Navigation Menu */}
          {topLevelMenus.map((link) => {
            const children = getChildrenForMenu(link.id);
            const hasSubs = children.length > 0;

            if (hasSubs) {
              return (
                <div key={`hier-dropdown-${link.id}`} className="relative group py-1">
                  <button
                    onClick={() => handleLinkClick(link.title, link.url, link.categoryId)}
                    className="flex items-center gap-1 hover:text-rose-600 transition cursor-pointer text-slate-605 font-bold text-xs border-0 bg-transparent py-1 focus:outline-none"
                  >
                    <span>{link.title}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-rose-600 group-hover:rotate-180 transition-all duration-300" />
                  </button>

                  {/* Sub Menu Drop Container: Elegant dropdown rendered top-to-down based on priority sequence */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-slate-200 shadow-xl hidden group-hover:block w-52 overflow-hidden z-50 p-2 rounded-xl animate-in slide-in-from-top-1 duration-150">
                    <div 
                      className="px-2.5 py-1.5 text-[9px] uppercase font-mono font-bold tracking-widest border-b border-slate-100 mb-1.5"
                      style={{ color: primaryCol }}
                    >
                      {link.title}
                    </div>
                    
                    <button
                      onClick={() => handleLinkClick(link.title, link.url, link.categoryId)}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-800 hover:text-rose-600 text-[11px] font-bold transition block cursor-pointer border-0 bg-transparent"
                    >
                      All {link.title}
                    </button>

                    {/* Children are sorted top-to-bottom by priority sequence */}
                    {children.map((subLink) => (
                      <button
                        key={`hier-sub-${subLink.id}`}
                        onClick={() => {
                          handleLinkClick(subLink.title, subLink.url, subLink.categoryId);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 hover:text-rose-605 text-[11px] font-semibold transition block cursor-pointer border-0 bg-transparent"
                      >
                        ↳ {subLink.title}
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
                className="hover:text-rose-600 transition cursor-pointer px-1 py-2 text-slate-605 font-bold text-xs border-0 bg-transparent focus:outline-none"
              >
                {link.title}
              </button>
            );
          })}
        </nav>
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

            {/* Admin Board Entry on Mobile */}
            <button
              onClick={() => {
                onOpenAdmin();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-between text-left py-2 px-3 rounded-lg text-xs font-semibold border border-slate-150 text-slate-705 bg-slate-50 hover:bg-slate-100 mt-1"
            >
              <span className="flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-rose-500" />
                Admin Board
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
                          className="w-full text-left py-1.5 px-3 text-[11px] font-semibold text-slate-500 hover:text-[#d11252] block bg-transparent border-0"
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
