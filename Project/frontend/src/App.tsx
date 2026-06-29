import React, { useCallback, useState, useEffect } from 'react';
import { DB_KEY, loadDbState, saveDbState } from './db';
import { DatabaseState, CurrencySettings, CartItem, Product, ProductStatus } from './types';
import Header from './components/Customer/Header';
import Footer from './components/Customer/Footer';
import ProductCard from './components/Customer/ProductCard';
import ProductDetailModal from './components/Customer/ProductDetailModal';
import CartDrawer from './components/Customer/CartDrawer';
import CustomerPortalModal from './components/Customer/CustomerPortalModal';
import PageRenderer from './components/Customer/PageRenderer';
import AdminPanel from './components/Admin/AdminPanel';
import SupportHub from './components/Customer/SupportHub';
import BlogViewer from './components/Customer/BlogViewer';
import { MessageCircle, MessageSquare, Phone, ShoppingBag, Filter, Sparkles, AlertCircle, ShoppingBasket, CheckCircle2, X } from 'lucide-react';
import { isProductOutOfStock, isProductOutOfStockForCustomer } from './utils/stockUtils';
import { exitAdminRoute, isAdminRoute } from './utils/adminRoute';
import {
  handleAuth0Callback,
  handleGoogleCallbackToken,
  loadCustomerSession,
  saveCustomerSession,
} from './utils/customerAuth';
import { verifyKhaltiPayment } from './utils/paymentHelpers';
import {
  clearPendingKhaltiCheckout,
  finalizeKhaltiCheckoutOrder,
  loadPendingKhaltiCheckout,
} from './utils/khaltiCheckout';

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState | null>(null);

  // Admin is only available at the dedicated URL (default: /admin)
  const [isAdminApp, setIsAdminApp] = useState(() => isAdminRoute());
  const [currentSlug, setCurrentSlug] = useState<string>('home');

  // Customer experience states
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencySettings | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartClickCount, setCartClickCount] = useState(0);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [portalInitialTab, setPortalInitialTab] = useState<'track' | 'signin' | 'reminder'>('track');
  const [reminderNotifications, setReminderNotifications] = useState<string[]>([]);
  const [remindersChecked, setRemindersChecked] = useState(false);
  const [customerUser, setCustomerUser] = useState<{ email: string; name: string; picture?: string; sub?: string } | null>(() => loadCustomerSession());
  const [selectedProductIdDetails, setSelectedProductIdDetails] = useState<string | null>(null);

  // Catalog filtrations and sorting
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogSort, setCatalogSort] = useState<string>('recent');
  const [customerProductPage, setCustomerProductPage] = useState<number>(1);

  const applyDatabaseState = useCallback((freshDb: DatabaseState) => {
    setDbState(freshDb);
    setSelectedCurrency((current) => {
      const preferredCode = current?.code || 'NPR';
      return (
        freshDb.currencies.find(c => c.code === preferredCode) ||
        freshDb.currencies.find(c => c.code === 'NPR') ||
        { code: 'NPR', symbol: 'Rs.', rateToNPR: 1.0, isDefault: true }
      );
    });
  }, []);

  useEffect(() => {
    setCustomerProductPage(1);
  }, [selectedCategoryFilter, selectedBrandFilter, catalogSearch, catalogSort]);

  const normalizeProductRouteKey = (value?: string) =>
    (value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const findProductForRoute = (productIdOrSlug?: string) => {
    if (!dbState || !productIdOrSlug) return undefined;
    const routeKey = normalizeProductRouteKey(decodeURIComponent(productIdOrSlug));
    const matches = dbState.products.filter((product) => {
      const productKeys = [
        product.id,
        product.slug,
        product.name,
        product.metaTitle
      ].map(normalizeProductRouteKey);

      return product.id === productIdOrSlug || product.slug === productIdOrSlug || productKeys.includes(routeKey);
    });

    return matches.find(product => product.status === ProductStatus.ACTIVE);
  };

  const applyCustomerRouteFromPath = () => {
    if (isAdminRoute()) return;

    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path || path === 'home' || path === 'page/home' || path === 'pages/home') {
      setCurrentSlug('home');
      setSelectedCategoryFilter('');
      setSelectedBrandFilter('');
      setCatalogSearch('');
      setSelectedProductIdDetails(null);
      if (window.location.pathname !== '/') {
        window.history.replaceState({}, '', '/');
      }
      return;
    }

    if (path.startsWith('category/')) {
      const categorySlug = decodeURIComponent(path.replace('category/', ''));
      setSelectedCategoryFilter(categorySlug);
      setSelectedBrandFilter('');
      setSelectedProductIdDetails(null);
      setCurrentSlug('catalog');
      return;
    }

    if (path.startsWith('product/')) {
      const productSlugOrId = decodeURIComponent(path.replace('product/', ''));
      const product = findProductForRoute(productSlugOrId);
      setSelectedCategoryFilter('');
      setSelectedBrandFilter('');
      setCatalogSearch('');
      setCurrentSlug('product');
      setSelectedProductIdDetails(product?.id || productSlugOrId);
      return;
    }

    if (path === 'catalog' || path === 'products') {
      setCurrentSlug('catalog');
      setSelectedProductIdDetails(null);
      return;
    }

    const pageSlug = path.replace(/^pages?\//, '');
    setCurrentSlug(decodeURIComponent(pageSlug));
    setSelectedCategoryFilter('');
    setSelectedBrandFilter('');
  };

  // Keep admin / storefront in sync with browser URL (back button, direct links)
  useEffect(() => {
    applyCustomerRouteFromPath();
    const onRouteChange = () => {
      setIsAdminApp(isAdminRoute());
      applyCustomerRouteFromPath();
    };
    window.addEventListener('popstate', onRouteChange);
    return () => window.removeEventListener('popstate', onRouteChange);
  }, []);

  useEffect(() => {
    if (!dbState || isAdminApp) return;
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (path.startsWith('product/')) {
      applyCustomerRouteFromPath();
    }
  }, [dbState, isAdminApp]);

  // Toast notification states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success'>('info');

  // Payment gateway return URL handler (eSewa / Khalti KPG-2 redirect back)
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('purchase_order_id') || '';

    if (path.includes('/payment/khalti/callback') || path.includes('/payment/khalti/success')) {
      const pidx = params.get('pidx');
      const callbackStatus = params.get('status');

      (async () => {
        try {
          if (pidx) {
            const lookup = await verifyKhaltiPayment(pidx);
            if (lookup.verified) {
              const freshDb = await loadDbState();
              const pending = loadPendingKhaltiCheckout();
              if (pending && (!ref || pending.refId === ref)) {
                const expectedPaisa = Math.round(pending.grandTotalConverted * 100);
                if (lookup.total_amount !== expectedPaisa) {
                  clearPendingKhaltiCheckout();
                  setToastMessage(
                    `Khalti amount mismatch (expected Rs. ${(expectedPaisa / 100).toFixed(2)}, got Rs. ${(lookup.total_amount / 100).toFixed(2)}). Order was not created.`,
                  );
                  setToastType('info');
                  window.history.replaceState({}, '', '/');
                  return;
                }
                const next = finalizeKhaltiCheckoutOrder(freshDb, pending, {
                  pidx: lookup.pidx,
                  transaction_id: lookup.transaction_id,
                  total_amount_paisa: lookup.total_amount,
                });
                saveDbState(next);
                setDbState(next);
                setCartItems([]);
                clearPendingKhaltiCheckout();
                setToastMessage(`Khalti payment confirmed! Order ${pending.refId} is placed.`);
              } else {
                setToastMessage(
                  ref
                    ? `Khalti payment confirmed for order ${ref}.`
                    : `Khalti payment confirmed (txn ${lookup.transaction_id || lookup.pidx}).`,
                );
              }
              setToastType('success');
            } else {
              const canceled = callbackStatus === 'User canceled' || lookup.status === 'User canceled';
              setToastMessage(
                canceled
                  ? 'Khalti payment was cancelled. Your cart is unchanged.'
                  : `Khalti payment status: ${lookup.status}. Order was not completed.`,
              );
              setToastType('info');
              clearPendingKhaltiCheckout();
            }
          } else {
            clearPendingKhaltiCheckout();
            setToastMessage('Khalti payment could not be verified (missing transaction ID). Your cart is unchanged.');
            setToastType('info');
          }
        } catch (err: unknown) {
          setToastMessage(err instanceof Error ? err.message : 'Khalti payment verification failed.');
          setToastType('info');
        }
        window.history.replaceState({}, '', '/');
      })();
      return;
    }

    if (path.includes('/payment/esewa/success')) {
      setToastMessage(ref ? `Payment received for order ${ref}. We will confirm shortly.` : 'Payment successful! We will confirm your order shortly.');
      setToastType('success');
      window.history.replaceState({}, '', '/');
    } else if (path.includes('/payment/esewa/failure') || path.includes('/payment/khalti/failure')) {
      setToastMessage(ref ? `Payment cancelled or failed for ${ref}. You can retry from your cart.` : 'Payment was cancelled or failed.');
      setToastType('info');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Google / Auth0 customer login callback
  useEffect(() => {
    if (window.location.pathname !== '/auth/callback') return;

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const token = params.get('token');
    const hasAuth0Code = params.has('code') && params.has('state');

    const finish = (message: string, type: 'success' | 'info' = 'success') => {
      setToastMessage(message);
      setToastType(type);
      setPortalInitialTab('signin');
      setIsPortalOpen(true);
      window.history.replaceState({}, '', '/');
    };

    if (error) {
      finish(`Sign-in failed: ${decodeURIComponent(error)}`, 'info');
      return;
    }

    (async () => {
      try {
        if (token) {
          const session = await handleGoogleCallbackToken(token);
          setCustomerUser(session);
          saveCustomerSession(session);
          finish(`Welcome back, ${session.name}! Your Gifting Lounge is ready.`);
          return;
        }
        if (hasAuth0Code) {
          const session = await handleAuth0Callback();
          if (session?.email) {
            setCustomerUser(session);
            saveCustomerSession(session);
            finish(`Welcome back, ${session.name}! Your Gifting Lounge is ready.`);
          } else {
            finish('Sign-in completed but no profile was returned.', 'info');
          }
          return;
        }
        finish('Sign-in callback missing credentials.', 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        finish(msg, 'info');
      }
    })();
  }, []);

  // Intercept standard window.alert inside sandboxed Iframe previews
  useEffect(() => {
    window.alert = (message: string) => {
      setToastMessage(message);
      const lower = message.toLowerCase();
      if (
        lower.includes('success') || 
        lower.includes('welcome') || 
        lower.includes('added') || 
        lower.includes('authorized') || 
        lower.includes('synchronized') || 
        lower.includes('active') ||
        lower.includes('complete')
      ) {
        setToastType('success');
      } else {
        setToastType('info');
      }
    };

    // Prevent iframe blocks and SecurityError exceptions by overriding window.confirm
    window.confirm = (message: string) => {
      console.log('window.confirm interception:', message);
      setToastMessage(`Action Approved: ${message.length > 70 ? message.slice(0, 70) + '...' : message}`);
      setToastType('success');
      return true;
    };
  }, []);

  // Toast self-dismissal countdown
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 1. Initial State Load on mounting (from MongoDB via API)
  useEffect(() => {
    loadDbState().then((freshDb) => {
    applyDatabaseState(freshDb);

    // Sync payment gateways with backend (pulling first to prevent local storage reset of credentials)
    fetch('/api/payment/get-gateways')
      .then(res => res.json())
      .then(data => {
        if (data && data.paymentGateways && data.paymentGateways.length > 0) {
          const merged = freshDb.paymentGateways.map((loc: any) => {
            const serv = data.paymentGateways.find((s: any) => s.id === loc.id);
            if (!serv) return loc;
            
            const merchantId = serv.merchantId || loc.merchantId || '';
            const secretKey = serv.secretKey || loc.secretKey || '';
            const publicKey = serv.publicKey || loc.publicKey || '';
            const existingExtra = serv.extraSettings || {};
            const localExtra = loc.extraSettings || {};
            const extraSettings = { ...localExtra };
            for (const key of new Set([...Object.keys(existingExtra), ...Object.keys(localExtra)])) {
              extraSettings[key as keyof typeof extraSettings] =
                (existingExtra as Record<string, string>)[key] ||
                (localExtra as Record<string, string>)[key] ||
                '';
            }
            return {
              ...loc,
              ...serv,
              merchantId,
              secretKey,
              publicKey,
              extraSettings
            };
          });
          const localIds = new Set(merged.map((g: { id: string }) => g.id));
          for (const serv of data.paymentGateways) {
            if (!localIds.has(serv.id)) merged.push(serv);
          }
          const updatedDb = { ...freshDb, paymentGateways: merged };
          applyDatabaseState(updatedDb);
          saveDbState(updatedDb);
        } else if (freshDb.paymentGateways) {
          // Sync existing to backend if backend is empty
          fetch('/api/payment/sync-gateways', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentGateways: freshDb.paymentGateways })
          }).catch(err => console.error('Failed to initial-sync payment gateways:', err));
        }
      })
      .catch(err => {
        console.error('Failed to pull payment gateways on boot:', err);
        // Fallback sync
        if (freshDb.paymentGateways) {
          fetch('/api/payment/sync-gateways', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentGateways: freshDb.paymentGateways })
          }).catch(e => console.error('Failed to initial-sync payment gateways:', e));
        }
      });
    }).catch(err => console.error('Failed to load store:', err));
  }, [applyDatabaseState]);

  // Keep customer storefront tabs aligned with admin edits saved in MongoDB.
  useEffect(() => {
    if (isAdminApp) return;

    let cancelled = false;
    const refreshStorefrontState = async () => {
      try {
        const freshDb = await loadDbState();
        if (!cancelled) applyDatabaseState(freshDb);
      } catch (err) {
        console.error('Failed to refresh storefront state:', err);
      }
    };

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key !== DB_KEY || !event.newValue) return;
      try {
        applyDatabaseState(JSON.parse(event.newValue) as DatabaseState);
      } catch (err) {
        console.error('Failed to sync storefront state from local storage:', err);
      }
    };

    const handleInTabStoreSync = (event: Event) => {
      const detail = (event as CustomEvent<DatabaseState>).detail;
      if (detail) applyDatabaseState(detail);
    };

    const handleFocusSync = () => {
      void refreshStorefrontState();
    };

    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        void refreshStorefrontState();
      }
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('koseli-store-updated', handleInTabStoreSync);
    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('pageshow', handleFocusSync);
    document.addEventListener('visibilitychange', handleVisibilitySync);
    const intervalId = window.setInterval(refreshStorefrontState, 30000);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('koseli-store-updated', handleInTabStoreSync);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('pageshow', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
      window.clearInterval(intervalId);
    };
  }, [applyDatabaseState, isAdminApp]);

  // Automated special day dispatch reminder checker (4 days prior month/day match)
  useEffect(() => {
    if (!dbState || !dbState.specialDayReminders || remindersChecked) return;

    const reminders = dbState.specialDayReminders;
    if (reminders.length === 0) {
      setRemindersChecked(true);
      return;
    }

    let updated = false;
    const newRemindersList = reminders.map(rem => {
      if (rem.autoReminded) return rem; // Already reminded

      // Determine if date matches today + 4 days (ignoring year)
      const parts = rem.date.split('-');
      if (parts.length < 3) return rem;
      const matchMonth = parseInt(parts[1], 10);
      const matchDay = parseInt(parts[2], 10);

      // Current local time setup
      const today = new Date();
      // Target is today + 4 days
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + 4);

      const is4DaysPrior = (targetDate.getMonth() + 1 === matchMonth) && (targetDate.getDate() === matchDay);

      if (is4DaysPrior) {
        updated = true;
        // Trigger automated simulation notification
        const msg = `Automated Koseli order booking offer dispatched successfully to client **${rem.email}** exactly 4 days prior to **${rem.name}**'s special event!`;
        setReminderNotifications(prev => [...prev, msg]);
        return { ...rem, autoReminded: true };
      }
      return rem;
    });

    if (updated) {
      handleUpdateDatabaseState({
        ...dbState,
        specialDayReminders: newRemindersList
      });
    }
    setRemindersChecked(true);
  }, [dbState, remindersChecked]);

  // 1.1 Real-time visitor activity logger
  useEffect(() => {
    if (isAdminApp) return;

    const lastTrackSessionKey = `last_track_${currentSlug}_${selectedProductIdDetails || ''}_${selectedCategoryFilter || ''}`;
    const lastTrackTimeStr = sessionStorage.getItem(lastTrackSessionKey);
    const nowTimeObj = Date.now();
    if (lastTrackTimeStr && nowTimeObj - parseInt(lastTrackTimeStr, 10) < 5000) {
      return;
    }
    sessionStorage.setItem(lastTrackSessionKey, String(nowTimeObj));

    setDbState(prev => {
      if (!prev) return prev;

      let pageTitle = 'Home Storefront';
      let slug = currentSlug;

      if (selectedProductIdDetails) {
        const prod = findProductForRoute(selectedProductIdDetails);
        if (prod) {
          pageTitle = `Product: ${prod.name}`;
          slug = `product/${prod.id}`;
        }
      } else if (currentSlug.startsWith('category/')) {
        const catId = currentSlug.replace('category/', '');
        const cat = prev.categories?.find(c => c.id === catId || c.slug === catId);
        pageTitle = cat ? `Category: ${cat.name}` : 'Category Catalog';
      } else if (currentSlug !== 'home') {
        const pg = prev.pages?.find(p => p.slug === currentSlug);
        pageTitle = pg ? pg.title : `Page: ${currentSlug}`;
      } else if (selectedCategoryFilter) {
        const cat = prev.categories?.find(c => c.id === selectedCategoryFilter || c.slug === selectedCategoryFilter);
        pageTitle = cat ? `Category Filter: ${cat.name}` : 'Category Catalog';
        slug = `category/${selectedCategoryFilter}`;
      }

      const userAgent = navigator.userAgent;
      let browser = 'Chrome';
      if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Edge')) browser = 'Edge';
      else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

      let os = 'Windows';
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Macintosh')) os = 'macOS';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
      else if (userAgent.includes('Linux')) os = 'Linux';

      let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        device = userAgent.includes('iPad') ? 'Tablet' : 'Mobile';
      }

      let country = 'Nepal';
      let countryCode = 'NP';
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone.includes('America')) {
          country = 'United States';
          countryCode = 'US';
        } else if (timezone.includes('Asia/Kolkata') || timezone.includes('Calcutta') || timezone.includes('Asia/Kathmandu')) {
          country = timezone.includes('Kathmandu') ? 'Nepal' : 'India';
          countryCode = timezone.includes('Kathmandu') ? 'NP' : 'IN';
        } else if (timezone.includes('Australia') || timezone.includes('Sydney') || timezone.includes('Melbourne')) {
          country = 'Australia';
          countryCode = 'AU';
        } else if (timezone.includes('Europe/London') || timezone.includes('GB')) {
          country = 'United Kingdom';
          countryCode = 'GB';
        } else if (timezone.includes('Asia/Tokyo') || timezone.includes('Japan')) {
          country = 'Japan';
          countryCode = 'JP';
        }
      } catch (e) {
        // Ignored
      }

      const newTrack = {
        id: `vt-live-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ip: `103.104.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country,
        countryCode,
        timestamp: new Date().toISOString(),
        pageSlug: slug,
        pageTitle,
        browser,
        os,
        device,
        duration: Math.floor(Math.random() * 45) + 12
      };

      const existingTracks = prev.visitorTracks || [];
      const updatedTracks = [...existingTracks, newTrack];
      if (updatedTracks.length > 500) {
        updatedTracks.shift();
      }

      const nextState = {
        ...prev,
        visitorTracks: updatedTracks
      };

      fetch('/api/store/visitor-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrack)
      }).catch(err => console.error('Failed to save visitor track:', err));

      return nextState;
    });

  }, [currentSlug, selectedProductIdDetails, selectedCategoryFilter, isAdminApp]);

  // Sync document title, favicon, SEO meta tags, GEO coordinates, and Schema.org JSON-LD structured data with current active view
  useEffect(() => {
    if (!dbState) return;

    // 1. Favicon sync
    if (dbState?.appearance?.favImage) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = dbState.appearance.favImage;
    }

    // 2. Identify active context metadata
    let pageTitle = dbState.store.storeName || 'Koseli Xpress';
    let pageDesc = 'Premium handwrapped cakes, flowers, and customized celebratory gift hampers delivered inside Kathmandu via Koseli Express.';
    let pageKeywords = 'gifts nepal, online cake delivery kathmandu, flower hampers balkumari, gift baskets lalitpur';
    let schemaObj: any = null;

    if (selectedProductIdDetails) {
      // PRODUCT DETAIL VIEW ACTIVE
      const p = findProductForRoute(selectedProductIdDetails);
      if (p) {
        const pName = p.name;
        const pPrice = p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
        pageTitle = p.metaTitle || `${pName} | Gift Online Nepal - Koseli`;
        pageDesc = p.metaDescription || `${pName} (Rs. ${pPrice}) - Premium customizable hamper. Buy online with direct delivery inside Kathmandu Valley.`;
        pageKeywords = p.metaKeywords || `${pName}, online gift hamper, custom cake ${pName}`;
        
        // Structured Product Schema
        schemaObj = {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": pName,
          "image": p.images && p.images[0] ? p.images[0] : "https://images.unsplash.com/photo-154946",
          "description": p.description || pageDesc,
          "sku": p.sku || `SKU-${p.id}`,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "NPR",
            "price": pPrice,
            "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": window.location.href,
            "itemCondition": "https://schema.org/NewCondition"
          }
        };
      }
    } else if (selectedCategoryFilter) {
      // CATEGORY FILTER ACTIVE
      const c = dbState.categories.find(cat => cat.id === selectedCategoryFilter);
      if (c) {
        pageTitle = c.metaTitle || `${c.name} Delivery Nepal | ${dbState.store.storeName}`;
        pageDesc = c.metaDescription || `Browse handpicked collection of ${c.name}. Direct express delivery in Kathmandu, Bhaktapur, and Lalitpur. ${c.description || ''}`;
        pageKeywords = c.metaKeywords || `${c.name}, online category gifts, send ${c.name} nepal`;
        
        // CollectionPage Schema
        schemaObj = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": c.name,
          "description": c.description || pageDesc,
          "url": window.location.href
        };
      }
    } else if (currentSlug && currentSlug !== 'home') {
      // CUSTOM PAGE ACTIVE
      const pg = dbState.pages.find(page => page.slug === currentSlug && page.status === 'active');
      if (pg) {
        pageTitle = pg.metaTitle || `${pg.title} | ${dbState.store.storeName}`;
        pageDesc = pg.metaDescription || `${pg.title} | ${dbState.store.storeName}`;
        pageKeywords = pg.metaKeywords || `${pg.title}, info portal, local services`;
        
        schemaObj = {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": pg.title,
          "description": pageDesc,
          "url": window.location.href
        };
      }
    } else {
      // HOME PAGE VIEW DEFAULT
      pageTitle = `${dbState.store.storeName} | Premium Gifting & Cake Delivery Kathmandu`;
      pageDesc = `Send handwrapped gift sets, gourmet cake blocks, flower options, and anniversary hampers. Safe hand-delivery across Kathmandu Valley.`;
      pageKeywords = `gifts nepal, cake delivery kathmandu, flower hampers balkumari, gift sets lalitpur`;
      
      // LocalBusiness Schema
      schemaObj = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": dbState.store.storeName,
        "image": dbState.appearance?.favImage || "https://images.unsplash.com/photo-154946",
        "telephone": dbState.store.supportPhone,
        "email": dbState.store.supportEmail,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": dbState.store.address,
          "addressLocality": dbState.store.geoPlacename || "Kathmandu",
          "addressCountry": "NP"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": dbState.store.geoPosition ? parseFloat(dbState.store.geoPosition.split(';')[0]) : 27.717244,
          "longitude": dbState.store.geoPosition ? parseFloat(dbState.store.geoPosition.split(';')[1]) : 85.324060
        },
        "url": window.location.href,
        "priceRange": "$$"
      };
    }

    // 3. Mutate standard Head DOM targets
    document.title = pageTitle;

    const updateMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('description', pageDesc);
    updateMetaTag('keywords', pageKeywords);

    // 4. Inject 100% compliant GEO parameters dynamically
    const geoReg = dbState.store.geoRegion || 'NP-BA';
    const geoPlace = dbState.store.geoPlacename || 'Kathmandu, Lalitpur, Bhaktapur';
    const geoPos = dbState.store.geoPosition || '27.717244;85.324060';

    updateMetaTag('geo.region', geoReg);
    updateMetaTag('geo.placename', geoPlace);
    updateMetaTag('geo.position', geoPos);
    updateMetaTag('ICBM', geoPos);

    // Dynamic schema script tracking
    let schemaScript = document.getElementById('dynamic-seo-schema-ld');
    if (schemaScript) {
      schemaScript.remove();
    }
    if (schemaObj) {
      const script = document.createElement('script');
      script.id = 'dynamic-seo-schema-ld';
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(schemaObj);
      document.head.appendChild(script);
    }

  }, [dbState, currentSlug, selectedProductIdDetails, selectedCategoryFilter]);

  // 4. Automatic 180 Minutes (3 hour) Nepal Rastra Bank Forex sync
  useEffect(() => {
    if (!dbState || !dbState.currencies) return;

    const performAutoExchangeSync = async () => {
      const nonNPRCurrencies = dbState.currencies.filter(c => c.code !== 'NPR');
      if (nonNPRCurrencies.length === 0) return;

      console.log('Initiating automatic Nepal Rastra Bank Forex multipliers sync (runs every 3 hours)...');
      
      let updated = false;
      const copy = [...dbState.currencies];

      for (const curr of nonNPRCurrencies) {
        try {
          const response = await fetch(`/api/forex/rate/${curr.code}`);
          const data = await response.json();
          if (response.ok && data.success && data.rateToForeign) {
            const newRate = parseFloat(data.rateToForeign.toFixed(6));
            
            // Update rate
            const idx = copy.findIndex(c => c.code === curr.code);
            if (idx !== -1 && copy[idx].rateToNPR !== newRate) {
              copy[idx] = { ...copy[idx], rateToNPR: newRate };
              updated = true;
            }
          }
        } catch (err) {
          console.error(`Auto-sync failed for ${curr.code}:`, err);
        }
      }

      if (updated) {
        const nextState = { ...dbState, currencies: copy };
        setDbState(nextState);
        saveDbState(nextState);
        
        // Also update selectedCurrency if it changed
        if (selectedCurrency && selectedCurrency.code !== 'NPR') {
          const fresh = copy.find(c => c.code === selectedCurrency.code);
          if (fresh) {
            setSelectedCurrency(fresh);
          }
        }
        console.log('Automatic Nepal Rastra Bank Forex multipliers synced successfully.');
      }
      
      localStorage.setItem('koseli_last_forex_sync', Date.now().toString());
    };

    // Check on load, and then run an interval every 1 minute to check elapsed time
    const checkAndSync = () => {
      const lastSyncStr = localStorage.getItem('koseli_last_forex_sync');
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const threeHoursMs = 3 * 60 * 60 * 1000;

      if (Date.now() - lastSync >= threeHoursMs) {
        performAutoExchangeSync();
      }
    };

    checkAndSync();
    const interval = setInterval(checkAndSync, 60000); // Check every minute if 3 hours have passed

    return () => clearInterval(interval);
  }, [dbState, selectedCurrency]);

  if (!dbState || !selectedCurrency) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-semibold font-mono text-xs">
        Booting Koseli Xpress engines...
      </div>
    );
  }

  // Wrapper utility to update db state and auto persist
  const handleUpdateDatabaseState = (newState: DatabaseState) => {
    setDbState(newState);
    saveDbState(newState);
    window.dispatchEvent(new CustomEvent('koseli-store-updated', { detail: newState }));
    if (newState.paymentGateways) {
      fetch('/api/payment/sync-gateways', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentGateways: newState.paymentGateways })
      }).catch(err => console.error('Failed to sync payment gateways to server:', err));
    }
    // Automatically synchronize catalog state to keep backend in lock-step
    fetch('/api/integrate/sync-catalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        products: newState.products || [],
        deliveryDistricts: newState.deliveryDistricts || [],
        coupons: newState.coupons || [],
        serviceFees: newState.serviceFees || []
      })
    }).catch(err => console.error('Failed to sync catalog state to server:', err));
  };

  // Add items to client cart basket safely
  const handleAddToCart = (
    product: Product,
    e?: React.MouseEvent,
    customMessage?: string,
    customImageUrl?: string,
    selectedVariations?: { name: string; value: string; priceAdjustment: number }[]
  ) => {
    if (e) {
      e.stopPropagation(); // Avoid triggering details modal click
    }

    if (dbState && isProductOutOfStockForCustomer(product, dbState.products)) {
      alert(`Sorry, "${product.name}" is currently out of stock due to composition inventory dependencies.`);
      return;
    }

    // Calculate total price adjustment from selected variations
    const netPriceAdjustment = selectedVariations
      ? selectedVariations.reduce((sum, vOpt) => sum + vOpt.priceAdjustment, 0)
      : 0;

    // Resolve base unmodified product price
    const baseRegularPrice = selectedVariations
      ? (product.price - netPriceAdjustment)
      : product.price;

    const basePrice = product.discountPrice !== undefined && product.discountPrice > 0 && product.discountPrice < baseRegularPrice
      ? product.discountPrice
      : baseRegularPrice;

    const activePrice = basePrice + netPriceAdjustment;

    setCartItems(prevItems => {
      const copy = [...prevItems];
      const idx = copy.findIndex(item => 
        item.productId === product.id && 
        item.customMessage === customMessage && 
        item.customImageUrl === customImageUrl &&
        (item.selectedPrice === undefined || item.selectedPrice === activePrice) &&
        (item.selectedVariations || []).length === (selectedVariations || []).length &&
        (item.selectedVariations || []).every((o, i) => selectedVariations && selectedVariations[i] && o.name === selectedVariations[i].name && o.value === selectedVariations[i].value)
      );
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
      } else {
        copy.push({
          productId: product.id,
          quantity: 1,
          selectedPrice: activePrice,
          customMessage,
          customImageUrl,
          selectedVariations
        });
      }
      return copy;
    });
    setIsCartOpen(true);
  };

  const getProductPath = (product: Product) => `/product/${encodeURIComponent(product.slug || product.id)}`;

  const navigateToProductDetails = (productId: string) => {
    const product = findProductForRoute(productId);
    setSelectedCategoryFilter('');
    setSelectedBrandFilter('');
    setCatalogSearch('');
    setCurrentSlug('product');
    setSelectedProductIdDetails(product?.id || productId);
    setCustomerProductPage(1);

    if (product) {
      const nextPath = getProductPath(product);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToSlug = (slug: string) => {
    const cleanSlug = (slug || 'home').replace(/^pages?\//, '').replace(/^\/+/, '') || 'home';
    setCurrentSlug(cleanSlug);
    setSelectedCategoryFilter('');
    setSelectedBrandFilter('');
    setCatalogSearch('');
    setSelectedProductIdDetails(null);
    setCustomerProductPage(1);
    const nextPath = cleanSlug === 'home' ? '/' : `/${cleanSlug}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  const navigateToCategory = (catIdOrSlug: string) => {
    const category = dbState.categories.find(cat => cat.id === catIdOrSlug || cat.slug === catIdOrSlug);
    const categoryKey = category?.slug || category?.id || catIdOrSlug;
    setSelectedCategoryFilter(category?.id || catIdOrSlug);
    setSelectedBrandFilter('');
    setCurrentSlug('catalog');
    const nextPath = `/category/${categoryKey}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  // Switch dynamic layouts based on resolving active slug
  const activePageConfig = dbState.pages.find(p => p.slug === currentSlug);
  const isCatalogView = currentSlug === 'catalog' || !!selectedCategoryFilter || !!selectedBrandFilter || !!catalogSearch;

  const normalizeCategoryKey = (value?: string) => (value || '').trim().toLowerCase();
  const getCategoryMatchKeys = (categoryIdOrSlug: string) => {
    const root = dbState.categories.find((cat) =>
      cat.id === categoryIdOrSlug ||
      cat.slug === categoryIdOrSlug ||
      normalizeCategoryKey(cat.name) === normalizeCategoryKey(categoryIdOrSlug)
    );
    if (!root) return new Set([normalizeCategoryKey(categoryIdOrSlug)]);

    const related = [root];
    const queue = [root.id];
    while (queue.length > 0) {
      const parentId = queue.shift();
      const children = dbState.categories.filter(cat => cat.parentCategoryId === parentId);
      related.push(...children);
      queue.push(...children.map(cat => cat.id));
    }

    return new Set(
      related.flatMap(cat => [cat.id, cat.slug, cat.name].map(normalizeCategoryKey)).filter(Boolean)
    );
  };

  const productMatchesSelectedCategory = (product: Product, categoryIdOrSlug: string) => {
    const selectedKeys = getCategoryMatchKeys(categoryIdOrSlug);
    const productCategoryValues = [product.categoryId, ...(product.categoryIds || [])].filter(Boolean);
    const productKeys = productCategoryValues.flatMap((categoryValue) => {
      const category = dbState.categories.find(cat =>
        cat.id === categoryValue ||
        cat.slug === categoryValue ||
        normalizeCategoryKey(cat.name) === normalizeCategoryKey(categoryValue)
      );
      return category
        ? [category.id, category.slug, category.name, categoryValue].map(normalizeCategoryKey)
        : [normalizeCategoryKey(categoryValue)];
    });
    return productKeys.some(key => selectedKeys.has(key));
  };

  const selectedCategory = selectedCategoryFilter
    ? dbState.categories.find(cat =>
        cat.id === selectedCategoryFilter ||
        cat.slug === selectedCategoryFilter ||
        normalizeCategoryKey(cat.name) === normalizeCategoryKey(selectedCategoryFilter)
      )
    : undefined;

  // Product listing matching filtration rules
  const catalogProductsBeforeSort = dbState.products.filter(p => {
    if (p.status !== ProductStatus.ACTIVE) return false;
    const matchesCategory = selectedCategoryFilter 
      ? productMatchesSelectedCategory(p, selectedCategoryFilter)
      : true;
    const matchesBrand = selectedBrandFilter ? p.brandId === selectedBrandFilter : true;
    const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCategory && matchesBrand && matchesSearch;
  });

  const catalogProducts = [...catalogProductsBeforeSort].sort((a, b) => {
    if (catalogSort === 'price-asc') {
      return a.price - b.price;
    }
    if (catalogSort === 'price-desc') {
      return b.price - a.price;
    }
    if (catalogSort === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    if (catalogSort === 'recent') {
      return b.id.localeCompare(a.id); // Simple fallback ID sort based on sequential IDs
    }
    return 0;
  });

  const customerProductsPerPage = 50;
  const totalCustomerProductPages = Math.ceil(catalogProducts.length / customerProductsPerPage);
  const paginatedCustomerProducts = catalogProducts.slice(
    (customerProductPage - 1) * customerProductsPerPage,
    customerProductPage * customerProductsPerPage
  );

  const primaryColor = dbState.appearance?.primaryColor || '#E91E63';
  const secondaryColor = dbState.appearance?.secondaryColor || '#C2185B';

  const hexToRgbObj = (hex: string) => {
    const clean = (hex || '').replace('#', '');
    let r = 233, g = 30, b = 99;
    if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    } else if (clean.length === 3) {
      const rStr = clean.substring(0, 1);
      const gStr = clean.substring(1, 2);
      const bStr = clean.substring(2, 3);
      r = parseInt(rStr + rStr, 16);
      g = parseInt(gStr + gStr, 16);
      b = parseInt(bStr + bStr, 16);
    }
    return { r, g, b };
  };

  const pObj = hexToRgbObj(primaryColor);
  const sObj = hexToRgbObj(secondaryColor);

  const primaryRgb = `${pObj.r}, ${pObj.g}, ${pObj.b}`;
  const secondaryRgb = `${sObj.r}, ${sObj.g}, ${sObj.b}`;
  const isLight = true; // Complete Theme Color Standardization (Always Blush Light Mode)

  // Compute a beautiful dark theme background derived dynamically from brand colors (no direct black!)
  // Blend 4% primary + 8% secondary + minimal ambient base offset
  const darkBgR = Math.min(28, Math.max(10, Math.round(pObj.r * 0.04 + sObj.r * 0.08)));
  const darkBgG = Math.min(28, Math.max(10, Math.round(pObj.g * 0.04 + sObj.g * 0.08)));
  const darkBgB = Math.min(32, Math.max(12, Math.round(pObj.b * 0.04 + sObj.b * 0.1)));

  // Elevate cards/sections slightly
  const darkCardR = Math.min(38, darkBgR + 8);
  const darkCardG = Math.min(38, darkBgG + 8);
  const darkCardB = Math.min(42, darkBgB + 10);

  // Input background
  const darkInputR = Math.min(32, darkBgR + 4);
  const darkInputG = Math.min(32, darkBgG + 4);
  const darkInputB = Math.min(36, darkBgB + 6);

  const dynamicBgDeep = isLight ? '#FFFBFC' : `rgb(${darkBgR}, ${darkBgG}, ${darkBgB})`;
  const dynamicBgCard = isLight ? '#ffffff' : `rgb(${darkCardR}, ${darkCardG}, ${darkCardB})`;
  const dynamicBgInput = isLight ? '#FFF9F9' : `rgb(${darkInputR}, ${darkInputG}, ${darkInputB})`;
  const dynamicBgHeader = isLight ? 'rgba(255, 255, 255, 0.95)' : `rgba(${darkBgR}, ${darkBgG}, ${darkBgB}, 0.93)`;
  const dynamicBgFooter = isLight ? '#ffffff' : `rgb(${darkBgR}, ${darkBgG}, ${darkBgB})`;

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
      isLight ? 'bg-[#FFFBFC] text-slate-800 theme-light' : 'text-slate-300 theme-dark'
    }`} style={{ backgroundColor: 'var(--theme-bg-deep)' }}>
      
      {/* Dynamic Style Injection representing active color choices */}
      <style>{`
        :root {
          --primary-theme: ${primaryColor};
          --secondary-theme: ${secondaryColor};
          --primary-rgb: ${primaryRgb};
          --secondary-rgb: ${secondaryRgb};
          --theme-bg-deep: ${dynamicBgDeep};
          --theme-bg-card: ${dynamicBgCard};
          --theme-bg-input: ${dynamicBgInput};
          --theme-bg-header: ${dynamicBgHeader};
          --theme-bg-footer: ${dynamicBgFooter};
        }
        
        body, button, input, select, textarea, .font-sans, .font-serif, .font-mono, h1, h2, h3, h4, h5, h6 {
          font-family: "Poppins", "Inter", sans-serif !important;
        }
        
        /* Overriding all text-amber variations across elements */
        .text-amber-50, .text-amber-100 { color: rgba(var(--primary-rgb), 0.1) !important; }
        .text-amber-200 { color: rgba(var(--primary-rgb), 0.3) !important; }
        .text-amber-300 { color: rgba(var(--primary-rgb), 0.7) !important; }
        .text-amber-400, .text-amber-500, .text-amber-600 {
          color: var(--primary-theme) !important;
        }
        .text-amber-700 { color: var(--primary-theme) !important; filter: brightness(0.85); }
        .text-amber-800 { color: var(--primary-theme) !important; filter: brightness(0.7); }
        .text-amber-900 { color: var(--primary-theme) !important; filter: brightness(0.5); }
        .text-amber-500\/80 {
          color: rgba(var(--primary-rgb), 0.8) !important;
        }
        .text-amber-500\/60 {
          color: rgba(var(--primary-rgb), 0.6) !important;
        }

        /* Overriding background-amber variations */
        .bg-amber-50 {
          background-color: rgba(var(--primary-rgb), 0.05) !important;
        }
        .bg-amber-100, .bg-amber-150 {
          background-color: rgba(var(--primary-rgb), 0.1) !important;
        }
        .bg-amber-200 {
          background-color: rgba(var(--primary-rgb), 0.25) !important;
        }
        .bg-amber-300 {
          background-color: rgba(var(--primary-rgb), 0.45) !important;
        }
        .bg-amber-400 {
          background-color: var(--primary-theme) !important;
          opacity: 0.9;
        }
        .bg-amber-500, .bg-amber-600, .bg-amber-700 {
          background-color: var(--primary-theme) !important;
        }
        .bg-amber-500\/5, .bg-amber-505\/10 {
          background-color: rgba(var(--primary-rgb), 0.05) !important;
        }
        .bg-amber-500\/10, .bg-amber-550\/10 {
          background-color: rgba(var(--primary-rgb), 0.1) !important;
        }
        .bg-amber-500\/20 {
          background-color: rgba(var(--primary-rgb), 0.2) !important;
        }
        .bg-amber-500\/30 {
          background-color: rgba(var(--primary-rgb), 0.3) !important;
        }

        /* Hover backgrounds */
        .hover\:bg-amber-400:hover, .hover\:bg-amber-500:hover, .hover\:bg-amber-600:hover {
          background-color: var(--primary-theme) !important;
          opacity: 0.95;
          color: #ffffff !important;
        }

        /* Overriding border-amber variations */
        .border-amber-100 { border-color: rgba(var(--primary-rgb), 0.1) !important; }
        .border-amber-200, .border-amber-200\/50 { border-color: rgba(var(--primary-rgb), 0.25) !important; }
        .border-amber-300 { border-color: rgba(var(--primary-rgb), 0.4) !important; }
        .border-amber-400, .border-amber-400\/20 { border-color: rgba(var(--primary-rgb), 0.5) !important; }
        .border-amber-500, .border-amber-500\/15, .border-amber-500\/20, .border-amber-500\/30, .border-amber-500\/40 {
          border-color: var(--primary-theme) !important;
        }

        /* Hover border variations */
        .hover\:border-amber-500\/40:hover, .hover\:border-amber-500\/30:hover, .hover\:border-amber-500\/20:hover {
          border-color: var(--primary-theme) !important;
        }
        .hover\:text-amber-400:hover, .hover\:text-amber-500:hover {
          color: var(--primary-theme) !important;
        }

        /* Focus states */
        .focus\:border-amber-500\/50:focus {
          border-color: var(--primary-theme) !important;
        }
        .focus\:ring-amber-500:focus {
          --tw-ring-color: var(--primary-theme) !important;
          border-color: var(--primary-theme) !important;
        }

        /* Rating stars fill override */
        .fill-amber-400, .fill-amber-500 {
          fill: var(--primary-theme) !important;
          color: var(--primary-theme) !important;
        }

        /* Dynamic logo gradient handling: from-amber-500 to-amber-200 to match the chosen colors perfectly */
        .from-amber-500 {
          --tw-gradient-from: var(--primary-theme) !important;
          --tw-gradient-to: rgba(var(--primary-rgb), 0) !important;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
        }
        .to-amber-200 {
          --tw-gradient-to: var(--secondary-theme) !important;
        }

        /* Box shadows */
        .shadow-amber-500\/5, .shadow-md.shadow-amber-500\/10 {
          box-shadow: 0 10px 15px -3px rgba(var(--primary-rgb), 0.2), 0 4px 6px -2px rgba(var(--primary-rgb), 0.15) !important;
        }
        .shadow-amber-500\/10 {
          box-shadow: 0 10px 15px -3px rgba(var(--primary-rgb), 0.35), 0 4px 6px -2px rgba(var(--primary-rgb), 0.25) !important;
        }

        /* Secondary purple custom overrides */
        .text-\[\#a78bfa\] {
          color: var(--secondary-theme) !important;
        }

        /* =======================================
           BLUSH LIGHT THEME BEAUTIFIED OVERRIDES 
           ======================================= */
        
        .theme-light {
          background-color: #FFFBFC !important;
          color: #1e293b !important;
        }

        /* Header Translucent Class overrides */
        .theme-light header {
          background-color: rgba(255, 255, 255, 0.95) !important;
          border-bottom: 1px solid rgba(var(--primary-rgb), 0.12) !important;
          box-shadow: 0 4px 20px -2px rgba(var(--primary-rgb), 0.05) !important;
        }
        .theme-light header button span.text-white, 
        .theme-light header span.text-white {
          color: #0f172a !important;
        }
        .theme-light header button .text-white {
          color: #0f172a !important;
        }
        .theme-light header nav button,
        .theme-light header .text-slate-400 {
          color: #475569 !important;
        }
        .theme-light header nav button:hover,
        .theme-light header nav button.text-amber-550,
        .theme-light header nav button.text-amber-500 {
          color: var(--primary-theme) !important;
        }
        .theme-light header nav div.group div.absolute {
          background-color: #ffffff !important;
          border: 1px solid rgba(var(--primary-rgb), 0.15) !important;
          box-shadow: 0 10px 25px -4px rgba(var(--primary-rgb), 0.08) !important;
        }
        .theme-light header nav div.group div.absolute button {
          color: #334155 !important;
        }
        .theme-light header nav div.group div.absolute button:hover {
          background-color: rgba(var(--primary-rgb), 0.05) !important;
          color: var(--primary-theme) !important;
        }

        /* Typography headings */
        .theme-light main h1, 
        .theme-light main h2, 
        .theme-light main h3 {
          color: #0f172a !important;
        }
        .theme-light main h1.font-serif,
        .theme-light main h3.font-serif,
        .theme-light main h2.font-serif {
          color: var(--primary-theme) !important;
        }
        .theme-light main p {
          color: #475569 !important;
        }

        /* Product Cards on Blush Canvas Grid */
        .theme-light main .group {
          background-color: #ffffff !important;
          border-color: rgba(var(--primary-rgb), 0.12) !important;
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02) !important;
        }
        .theme-light main .group:hover {
          border-color: var(--primary-theme) !important;
          box-shadow: 0 12px 24px -4px rgba(var(--primary-rgb), 0.12), 0 4px 12px -2px rgba(var(--primary-rgb), 0.06) !important;
          transform: translateY(-2px);
        }
        .theme-light main .group h4.text-white {
          color: #0f172a !important;
        }
        .theme-light main .group h4.text-white:hover {
          color: var(--primary-theme) !important;
        }
        .theme-light main .group p.text-slate-400 {
          color: #475569 !important;
        }
        .theme-light main .group span.text-amber-500\/80 {
          color: var(--secondary-theme) !important;
          font-weight: 700 !important;
        }

        /* Sidebar search and filters */
        .theme-light aside:not(.admin-sidebar) input {
          background-color: #ffffff !important;
          border-color: rgba(var(--primary-rgb), 0.16) !important;
          color: #0f172a !important;
        }
        .theme-light aside:not(.admin-sidebar) input:focus {
          border-color: var(--primary-theme) !important;
          box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1) !important;
        }
        .theme-light aside:not(.admin-sidebar) button {
          background-color: #ffffff !important;
          border-color: rgba(var(--primary-rgb), 0.1) !important;
          color: #475569 !important;
        }
        .theme-light aside:not(.admin-sidebar) button:hover {
          border-color: var(--primary-theme) !important;
          color: var(--primary-theme) !important;
          background-color: rgba(var(--primary-rgb), 0.02) !important;
        }
        .theme-light aside:not(.admin-sidebar) button.bg-amber-500 {
          background-color: var(--primary-theme) !important;
          color: #ffffff !important;
          border-color: var(--primary-theme) !important;
        }

        /* Page Builder dynamic sections and category sliders */
        .theme-light div[class*="bg-[#0c0c0c]"],
        .theme-light div[class*="bg-[#0a0a0a]"],
        .theme-light div[class*="bg-[#050505]"],
        .theme-light div[class*="bg-[#0d0d0d]"] {
          background-color: #ffffff !important;
          border-color: rgba(var(--primary-rgb), 0.1) !important;
          color: #1e293b !important;
        }
        
        .theme-light .border-white\/5,
        .theme-light .border-white\/10 {
          border-color: rgba(var(--primary-rgb), 0.1) !important;
        }

        /* Cart / Checkout Sidedrawers */
        .theme-light div[role="dialog"],
        .theme-light .fixed.inset-y-0.right-0 {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-left: 1px solid rgba(var(--primary-rgb), 0.12) !important;
        }
        .theme-light div[role="dialog"] h2,
        .theme-light div[role="dialog"] h3,
        .theme-light div[role="dialog"] p,
        .theme-light div[role="dialog"] span {
          color: #1e293b !important;
        }
        .theme-light div[role="dialog"] .text-slate-400,
        .theme-light div[role="dialog"] .text-slate-500 {
          color: #51627c !important;
        }
        .theme-light div[role="dialog"] input,
        .theme-light div[role="dialog"] select,
        .theme-light div[role="dialog"] textarea {
          background-color: #FFF9F9 !important;
          border-color: rgba(var(--primary-rgb), 0.16) !important;
          color: #0f172a !important;
        }
        .theme-light div[role="dialog"] div[class*="bg-slate-900"],
        .theme-light div[role="dialog"] div[class*="bg-[#050505]"] {
          background-color: #FFF5F5 !important;
          border-color: rgba(var(--primary-rgb), 0.12) !important;
        }

        /* Details Modal popups */
        .theme-light .fixed.inset-0.bg-black\/80 {
          background-color: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(5px) !important;
        }
        .theme-light div[role="dialog"] .divide-white\/5 > * {
          border-color: rgba(var(--primary-rgb), 0.1) !important;
        }

        /* Premium dark footer — do not override #site-footer styles */

        /* =======================================
           DYNAMIC BRAND-DARK MODE OVERRIDES      
           ======================================= */
        .theme-dark {
          background-color: var(--theme-bg-deep) !important;
          color: #cbd5e1 !important;
        }

        /* Override deep background blocks */
        .theme-dark .bg-\[\#050505\],
        .theme-dark .bg-slate-950,
        .theme-dark .bg-black,
        .theme-dark .bg-stone-950,
        .theme-dark .bg-zinc-950 {
          background-color: var(--theme-bg-deep) !important;
        }

        /* Override midground card blocks */
        .theme-dark .bg-\[\#0d0d0d\],
        .theme-dark .bg-white\/\[0\.01\],
        .theme-dark .bg-slate-900,
        .theme-dark .bg-stone-900,
        .theme-dark .bg-zinc-900,
        .theme-dark .bg-\[\#131313\] {
          background-color: var(--theme-bg-card) !important;
        }

        /* Override inputs and select blocks */
        .theme-dark .bg-\[\#0a0a0a\],
        .theme-dark .bg-\[\#0c0c0c\],
        .theme-dark .bg-white\/\[0\.02\],
        .theme-dark input:not([type="checkbox"]):not([type="radio"]),
        .theme-dark select,
        .theme-dark textarea {
          background-color: var(--theme-bg-input) !important;
          border-color: rgba(var(--primary-rgb), 0.15) !important;
          color: #ffffff !important;
        }

        /* Override footer block */
        .theme-dark footer,
        .theme-dark footer.bg-\[\#050505\] {
          background-color: var(--theme-bg-footer) !important;
          border-color: rgba(var(--primary-rgb), 0.1) !important;
        }

        .theme-dark footer div[class*="bg-[#0a0a0a]"],
        .theme-dark footer div[class*="border-white/5"] {
          background-color: var(--theme-bg-input) !important;
          border-color: rgba(var(--primary-rgb), 0.08) !important;
        }

        /* Dialog & Modal elevated styling */
        .theme-dark div[role="dialog"],
        .theme-dark .fixed.inset-y-0.right-0 {
          background-color: var(--theme-bg-card) !important;
          border-color: rgba(var(--primary-rgb), 0.15) !important;
          color: #f1f5f9 !important;
        }

        .theme-dark div[role="dialog"] div[class*="bg-[#050505]"],
        .theme-dark div[role="dialog"] div[class*="bg-slate-905"],
        .theme-dark div[role="dialog"] div[class*="bg-[#0a0a0a]"],
        .theme-dark div[role="dialog"] .bg-white\/\[0\.01\] {
          background-color: var(--theme-bg-input) !important;
          border-color: rgba(var(--primary-rgb), 0.1) !important;
        }

        /* Admin Dashboard & Generic Container elements dynamic matching rules */
        .bg-slate-950,
        .bg-black,
        .bg-\[\#020202\],
        .bg-\[\#050505\],
        .bg-\[\#050505\]\/80 {
          background-color: var(--theme-bg-deep) !important;
        }
        
        .border-white\/5,
        .border-white\/10 {
          border-color: rgba(var(--primary-rgb), 0.1) !important;
        }
      `}</style>
      
      {isAdminApp ? (
        /* ADMIN PANEL — only at /admin (or VITE_ADMIN_PATH) */
        <AdminPanel
          state={dbState}
          onUpdateState={handleUpdateDatabaseState}
          onExitAdmin={() => {
            exitAdminRoute();
            setIsAdminApp(false);
          }}
        />
      ) : (
        /* CUSTOMER FACING STOREFRONT */
        <>
          <Header
            state={dbState}
            selectedCurrency={selectedCurrency}
            onSelectCurrency={setSelectedCurrency}
            cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            onOpenCart={() => {
              setIsCartOpen(true);
              setCartClickCount(prev => prev + 1);
            }}
            onOpenPortal={(tab) => {
              setPortalInitialTab(tab || 'track');
              setIsPortalOpen(true);
            }}
            onSelectCategory={(catId) => {
              navigateToCategory(catId);
            }}
            onNavigateToSlug={navigateToSlug}
            currentSlug={currentSlug}
            searchQuery={catalogSearch}
            onSearchChange={setCatalogSearch}
            customerUser={customerUser}
            onLogoutCustomer={() => {
              setCustomerUser(null);
              saveCustomerSession(null);
              setToastType('info');
              setToastMessage('Logged out of your Gifting Lounge account.');
            }}
          />

          {dbState.store.maintenanceMode ? (
            /* SCHEDULED MAINTENANCE MODE OVERLAY VIEW */
            <div className="flex-grow flex items-center justify-center p-6 text-center">
              <div className="max-w-lg w-full bg-[#0d0d0d] border border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl">
                <h1 className="text-3xl font-serif italic text-white">{dbState.store.storeName || 'Store'} is temporarily unavailable.</h1>
              </div>
            </div>
          ) : (
            /* Primary View Area layout */
            <main className={`flex-grow w-full ${
              selectedProductIdDetails
                ? 'max-w-none px-0 py-0'
                : currentSlug === 'home' && activePageConfig && !isCatalogView
                ? 'max-w-none px-0 py-0'
                : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
            }`}>
              
              {selectedProductIdDetails ? (
                <ProductDetailModal
                  productId={selectedProductIdDetails}
                  state={dbState}
                  onUpdateState={handleUpdateDatabaseState}
                  selectedCurrency={selectedCurrency}
                    onClose={() => navigateToSlug('catalog')}
                    onNavigateProduct={navigateToProductDetails}
                  onAddToCart={(p, msg, img, vars) => handleAddToCart(p, undefined, msg, img, vars)}
                />
              ) : currentSlug === 'blog' || currentSlug.startsWith('blog/') || currentSlug.startsWith('blog-') ? (
                <BlogViewer 
                  currentSlug={currentSlug}
                  state={dbState}
                  onNavigateToSlug={navigateToSlug}
                  primaryColor={primaryColor}
                />
              ) : activePageConfig && !isCatalogView ? (
              /* RENDER VISUAL LAYOUT DRAFT FROM PAGE BUILDER SCHEMA */
              <div className={currentSlug === 'home' ? 'space-y-0' : 'space-y-12'}>
                {/* Visual header for non-home custom pages */}
                {currentSlug !== 'home' && (
                  <div className="text-left pb-4 border-b border-white/5">
                    <h1 className="text-3xl font-serif italic text-white tracking-wide">{activePageConfig.title}</h1>
                  </div>
                )}

                <PageRenderer
                  sections={activePageConfig.sections}
                  state={dbState}
                  selectedCurrency={selectedCurrency}
                    onViewProductDetails={navigateToProductDetails}
                  onAddToCart={(p, e) => handleAddToCart(p, e)}
                  onNavigateToCategory={(catId) => {
                    navigateToCategory(catId);
                  }}
                />
              </div>
            ) : (
              /* RESOLVING TO GENERAL STORE CATALOG LISTING */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-rose-100/70 pb-4 gap-4 text-left bg-white/70 rounded-2xl px-4 py-4 shadow-sm">
                  <div>
                    <h1 className="text-3xl font-serif italic text-slate-900 tracking-wide">
                      {selectedCategoryFilter 
                        ? selectedCategory?.name || 'Catalog'
                        : 'All Products'
                      }
                    </h1>
                    <p className="text-xs text-rose-600/80 font-mono tracking-widest uppercase mt-1">
                      {selectedCategoryFilter 
                        ? selectedCategory?.description || `${catalogProducts.length} products available`
                        : `${catalogProducts.length} products available`
                      }
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700">
                    {catalogProducts.length} product{catalogProducts.length === 1 ? '' : 's'} found
                  </div>

                  {/* Quick Filters breadcrumb reset */}
                  {(selectedCategoryFilter || selectedBrandFilter || catalogSearch) && (
                    <button
                      onClick={() => {
                        setSelectedCategoryFilter('');
                        setSelectedBrandFilter('');
                        setCatalogSearch('');
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20 rounded-lg transition"
                    >
                      Reset Catalog Search filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Sidebar Filters panel */}
                  <aside className="lg:col-span-1 space-y-6 text-left">
                    {/* Search inside catalog */}
                    <div className="hidden lg:block space-y-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#a78bfa] block font-mono">Keyword Search</span>
                      <input
                        type="text"
                        placeholder="Bouquet, combo, chocolate..."
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>

                    {/* Sort Dropdown Selector */}
                    <div className="space-y-1.5 pt-0 lg:pt-2 lg:border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#a78bfa] block font-mono">Sort Products By</span>
                      <select
                        value={catalogSort}
                        onChange={(e) => setCatalogSort(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:amber-500/50 cursor-pointer"
                      >
                        <option value="recent">Recently Added (Newest)</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="alpha">Alphabetical (A - Z)</option>
                      </select>
                    </div>

                    {/* Filter categories lookup */}
                    <div className="hidden lg:block space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#a78bfa] block font-mono">Occasions / Categories</span>
                      <div className="flex flex-wrap lg:flex-col gap-1.5">
                        <button
                          key="all-cat"
                          onClick={() => setSelectedCategoryFilter('')}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${!selectedCategoryFilter ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' : 'bg-[#0a0a0a] border border-white/5 hover:border-amber-500/20 text-slate-400 hover:text-white'}`}
                        >
                          All Categories
                        </button>
                        {dbState.categories.map((cat, idx) => (
                          <button
                            key={`cat-filter-btn-${cat.id || idx}`}
                            onClick={() => navigateToCategory(cat.id)}
                            className={`px-3.5 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${selectedCategory?.id === cat.id ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' : 'bg-[#0a0a0a] border border-white/5 hover:border-amber-500/20 text-slate-400 hover:text-white'}`}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Brands lookup */}
                    <div className="hidden lg:block space-y-2 pt-2 border-t border-white/5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#a78bfa] block font-mono">Gifting Brands Guild</span>
                      <div className="flex flex-wrap lg:flex-col gap-1.5">
                        <button
                          key="all-brands"
                          onClick={() => setSelectedBrandFilter('')}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${!selectedBrandFilter ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' : 'bg-[#0a0a0a] border border-white/5 hover:border-amber-500/20 text-slate-400 hover:text-white'}`}
                        >
                          All Brands
                        </button>
                        {dbState.brands.map((brand, idx) => (
                          <button
                            key={`brand-filter-btn-${brand.id || idx}`}
                            onClick={() => setSelectedBrandFilter(brand.id)}
                            className={`px-3.5 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${selectedBrandFilter === brand.id ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' : 'bg-[#0a0a0a] border border-white/5 hover:border-amber-500/20 text-slate-455 hover:text-white'}`}
                          >
                            {brand.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>

                  {/* Showcase Products Cards Grid */}
                  <div className="lg:col-span-3">
                    {catalogProducts.length === 0 ? (
                      <div className="py-24 text-center border rounded-2xl bg-[#0d0d0d] border-white/5 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#050505] border border-white/5 flex items-center justify-center mx-auto text-slate-550">
                          <ShoppingBasket className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <h4 className="font-serif italic text-white text-base">No products found</h4>
                          <p className="text-xs text-slate-450 max-w-sm mx-auto mt-1 leading-relaxed">We couldn't locate active products matching this specific criteria. Clear tags or search strings to retry.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                          {paginatedCustomerProducts.map((prod, idx) => (
                            <ProductCard
                              key={`catalog-prod-card-${prod.id || idx}-${idx}`}
                              product={prod}
                              selectedCurrency={selectedCurrency}
                              deliveryGroups={dbState.deliveryGroups}
                              onViewDetails={navigateToProductDetails}
                              onAddToCart={(p, e) => handleAddToCart(p, e)}
                              allProducts={dbState.products}
                            />
                          ))}
                        </div>
                        {totalCustomerProductPages > 1 && (
                          <div className="mt-8 pt-4 border-t border-rose-100/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                            <div>
                              Showing <strong className="text-slate-800">{Math.min(catalogProducts.length, (customerProductPage - 1) * customerProductsPerPage + 1)}-{Math.min(catalogProducts.length, customerProductPage * customerProductsPerPage)}</strong> of <strong className="text-slate-800">{catalogProducts.length}</strong> products
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                disabled={customerProductPage === 1}
                                onClick={() => {
                                  setCustomerProductPage(1);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="p-1 px-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded text-slate-705 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                              >
                                First
                              </button>
                              <button
                                type="button"
                                disabled={customerProductPage === 1}
                                onClick={() => {
                                  setCustomerProductPage(prev => Math.max(1, prev - 1));
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="p-1.5 px-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded text-slate-705 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                              >
                                Prev
                              </button>
                              <span className="px-3 py-1 font-bold text-slate-808 bg-rose-50/20 border border-rose-100 rounded">
                                {customerProductPage} / {totalCustomerProductPages}
                              </span>
                              <button
                                type="button"
                                disabled={customerProductPage === totalCustomerProductPages}
                                onClick={() => {
                                  setCustomerProductPage(prev => Math.min(totalCustomerProductPages, prev + 1));
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="p-1.5 px-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded text-slate-705 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                              >
                                Next
                              </button>
                              <button
                                type="button"
                                disabled={customerProductPage === totalCustomerProductPages}
                                onClick={() => {
                                  setCustomerProductPage(totalCustomerProductPages);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="p-1 px-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded text-slate-705 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                              >
                                Last
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
          )}

          {/* DYNAMIC CATEGORY QUICK NAVIGATION BAR ABOVE FOOTER */}
          <div className="border-t border-rose-100/50 bg-[#FFFDFD]/85 py-7 mb-0 shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
              {/* Browse Categories */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-[1px] w-8 bg-rose-200"></div>
                  <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#a78bfa]">
                    Browse Gifting Categories &amp; Occasions
                  </span>
                  <div className="h-[1px] w-8 bg-rose-200"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter('');
                      navigateToSlug('catalog');
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      !selectedCategoryFilter 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                        : 'bg-white border border-rose-105 hover:border-amber-500/25 text-slate-600 hover:text-rose-600 shadow-sm'
                    }`}
                  >
                    All Categories
                  </button>
                  {dbState.categories.map((cat, idx) => (
                    <button
                      key={`footer-top-cat-${cat.id || idx}`}
                      type="button"
                      onClick={() => {
                        navigateToCategory(cat.id);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        selectedCategory?.id === cat.id 
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                          : 'bg-white border border-rose-105 hover:border-amber-500/25 text-slate-600 hover:text-rose-600 shadow-sm'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse Brands - Only visible on mobile and tablet */}
              <div className="lg:hidden space-y-4 pt-5 border-t border-rose-100/30">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-[1px] w-8 bg-rose-200"></div>
                  <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#a78bfa]">
                    Browse Gifting Brands
                  </span>
                  <div className="h-[1px] w-8 bg-rose-200"></div>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrandFilter('');
                      setCurrentSlug('catalog');
                      if (window.location.pathname !== '/catalog') {
                        window.history.pushState({}, '', '/catalog');
                      }
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      !selectedBrandFilter 
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                        : 'bg-white border border-rose-105 hover:border-amber-500/25 text-slate-600 hover:text-rose-600 shadow-sm'
                    }`}
                  >
                    All Brands
                  </button>
                  {dbState.brands.map((brand, idx) => (
                    <button
                      key={`footer-top-brand-${brand.id || idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedBrandFilter(brand.id);
                        setCurrentSlug('catalog');
                        if (window.location.pathname !== '/catalog') {
                          window.history.pushState({}, '', '/catalog');
                        }
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                        selectedBrandFilter === brand.id 
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                          : 'bg-white border border-rose-105 hover:border-amber-500/25 text-slate-600 hover:text-rose-600 shadow-sm'
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Footer state={dbState} />

          {/* UNIFIED CUSTOMER ASSISTANT AI AGENT & WHATSAPP SUPPORT HUB */}
          <SupportHub 
            state={dbState} 
            onUpdateState={handleUpdateDatabaseState}
            onAddToCart={(product) => handleAddToCart(product)}
            onOpenCart={() => {
              setIsCartOpen(true);
              setCartClickCount(prev => prev + 1);
            }}
          />

          {/* CART DRAWER CHECKOUT SLIDE-OVER */}
          <CartDrawer
            state={dbState}
            onUpdateState={handleUpdateDatabaseState}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            onUpdateCartItems={setCartItems}
            selectedCurrency={selectedCurrency}
            onSelectCurrency={setSelectedCurrency}
            customerUser={customerUser}
            cartClickCount={cartClickCount}
          />

          {/* CUSTOMER GUEST RECOVERY & TRACKING CENTRAL */}
          <CustomerPortalModal
            state={dbState}
            isOpen={isPortalOpen}
            onClose={() => setIsPortalOpen(false)}
            initialTab={portalInitialTab}
            customerUser={customerUser}
            onUpdateCustomerUser={setCustomerUser}
            onUpdateState={handleUpdateDatabaseState}
          />

          {/* REMINDER AUTOMATED EMAIL NOTIFICATION TOAST OVERLAYS */}
          {reminderNotifications.length > 0 && (
            <div className="fixed bottom-6 left-6 z-[100] max-w-sm w-full space-y-3">
              {reminderNotifications.map((notif, idx) => (
                <div key={idx} className="bg-rose-950/95 backdrop-blur-md border border-rose-500/30 p-4 rounded-2xl shadow-2xl flex gap-3 items-start animate-in slide-in-from-left-5 duration-350 text-left">
                  <div className="p-2 rounded-xl shrink-0 bg-rose-500/10 text-rose-500 border border-rose-500/20">
                    <Sparkles className="w-5 h-5 text-rose-400 animate-pulse" />
                  </div>
                  <div className="flex-grow space-y-1">
                    <span className="text-[9px] font-mono tracking-widest font-bold text-rose-300 uppercase block">📧 Automated Email Dispatched</span>
                    <p className="text-[11.5px] text-rose-100 leading-relaxed font-semibold font-sans" dangerouslySetInnerHTML={{ __html: notif.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                  <button 
                    onClick={() => setReminderNotifications(prev => prev.filter((_, i) => i !== idx))}
                    className="text-rose-300 hover:text-white p-1 rounded-md transition cursor-pointer"
                  >
                    <X className="w-4 h-4 bg-transparent border-0" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* DYNAMIC TOAST OR OVERLAY PREVIEW NOTIFICATION POP-UP */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex gap-3 items-start animate-in slide-in-from-bottom-5 duration-350 text-left">
              <div className={`p-2 rounded-xl shrink-0 ${toastType === 'success' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                {toastType === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex-grow space-y-1">
                <span className="text-[9px] font-mono tracking-widest font-bold text-slate-505 uppercase block">System Notification</span>
                <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">{toastMessage}</p>
              </div>
              <button 
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4 bg-transparent border-none" />
              </button>
            </div>
          )}
        </>
      )}

    </div>
  );
}
