import React, { useState, useEffect } from 'react';
import { DatabaseState, UserRole, Role, RolePermissions } from '../../types';
import { findAdminUser, restoreAdminSession, saveAdminSession, clearAdminSession } from '../../utils/adminAuth';
import DashboardTab from './DashboardTab';
import ProductsTab from './ProductsTab';
import InventoryTab from './InventoryTab';
import OrdersTab from './OrdersTab';
import PagesTab from './PagesTab';
import SettingsTab from './SettingsTab';
import ReviewsTab from './ReviewsTab';
import CouponsTab from './CouponsTab';
import AccountingTab from './AccountingTab';
import SEOTab from './SEOTab';
import APIIntegrationTab from './APIIntegrationTab';
import SocialMarketingTab from './SocialMarketingTab';
import BlogWriterTab from './BlogWriterTab';

import SupportChatsTab from './SupportChatsTab';

import { 
  LayoutDashboard, 
  ShoppingBag, 
  Archive, 
  ShoppingCart, 
  Layers, 
  Settings, 
  Star, 
  Percent, 
  LogOut, 
  ShieldCheck, 
  Lock,
  PieChart,
  Sparkles,
  Terminal,
  Share2,
  BookOpen,
  MessageSquare,
  Search,
  Bell,
  Store,
  UserCircle2,
  Menu,
  X,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'products' | 'inventory' | 'orders' | 'pages' | 'reviews' | 'coupons' | 'settings' | 'accounting' | 'seo' | 'api_integration' | 'social_marketing' | 'blogs' | 'support_chats';

interface NavItem {
  id: AdminTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface AdminPanelProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
  onExitAdmin: () => void;
}

export default function AdminPanel({ state, onUpdateState, onExitAdmin }: AdminPanelProps) {
  const [currentUser, setCurrentUser] = useState<UserRole | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Restore session after refresh (sessionStorage survives reload within same tab)
  useEffect(() => {
    const restored = restoreAdminSession(state.users || []);
    if (restored) setCurrentUser(restored);
    setSessionReady(true);
  }, [state.users]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileNavOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  // Direct Gmail & Password login states
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const handleVerifyDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setErrorMessage('Please type both Gmail/Email and Password.');
      return;
    }
    
    // Support matching by lowercased email and password or passcode PIN
    const matchedUser = findAdminUser(state.users, emailInput, passwordInput);
    
    if (matchedUser) {
      if (matchedUser.status === 'inactive') {
        setErrorMessage('Access Denied: Your account standing is INACTIVE. Please contact your administrator.');
        return;
      }
      setCurrentUser(matchedUser);
      saveAdminSession(matchedUser);
      setErrorMessage('');
    } else {
      setErrorMessage('Access Denied: Incorrect Gmail or password.');
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setCurrentUser(null);
    setEmailInput('');
    setPasswordInput('');
    setErrorMessage('');
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#0c0a10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-pink-200/60">
          <div className="w-8 h-8 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
          <span className="text-xs font-medium">Restoring session…</span>
        </div>
      </div>
    );
  }

  // Guard Screen visual
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#140810] flex flex-col justify-center items-center p-4 text-slate-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(233,30,99,0.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(233,30,99,0.12),transparent_38%)]" />
        <div className="relative max-w-md w-full bg-[#1a0a12]/95 border border-pink-500/20 p-8 rounded-2xl shadow-2xl shadow-black/50 space-y-6 backdrop-blur-xl">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-gradient-to-br from-[#E91E63] to-[#C2185B] text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-pink-900/40">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-pink-300">Koseli Xpress</p>
              <h1 className="text-2xl font-bold text-white font-sans tracking-tight mt-1">Admin Workspace</h1>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">Secure access for catalog, fulfillment, finance, marketing, and system operations.</p>
          </div>

          <form onSubmit={handleVerifyDirect} className="space-y-4 text-left">
            <div className="space-y-3.5 text-left text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Gmail Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-pink-500/15 rounded-xl p-3.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400/50 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1.5">Passphrase Secret</label>
                <input
                  type="password"
                  required
                  placeholder="Enter account security password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-white/[0.04] border border-pink-500/15 rounded-xl p-3.5 text-slate-100 placeholder-slate-600 text-sm focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400/50 focus:outline-none transition"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-300 bg-rose-950/30 border border-rose-500/20 p-2.5 rounded-lg text-center font-bold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 text-xs font-extrabold text-white bg-gradient-to-r from-[#E91E63] to-[#C2185B] hover:from-[#D81B60] hover:to-[#AD1457] rounded-xl transition cursor-pointer shadow-lg shadow-pink-950/40 uppercase tracking-wide"
            >
              Sign In to Dashboard
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onExitAdmin}
              className="text-xs font-semibold text-slate-400 hover:text-white transition inline-flex items-center gap-2"
            >
              Back to Customer Front Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic Credentials Role-Based Access Control
  const defaultPerms = {
    [Role.ADMIN]: { orderProcess: true, accounts: true, productEdit: true, purchaseEntry: true, systemSettings: true },
    [Role.MANAGER]: { orderProcess: true, accounts: false, productEdit: true, purchaseEntry: true, systemSettings: false },
    [Role.STAFF]: { orderProcess: true, accounts: false, productEdit: false, purchaseEntry: false, systemSettings: false }
  };

  const rolePerms = state.rolePermissions || defaultPerms;
  const userPerms = {
    orderProcess: true,
    accounts: false,
    productEdit: false,
    purchaseEntry: false,
    systemSettings: false,
    ...(rolePerms[currentUser.role] || defaultPerms[currentUser.role])
  };

  const getRequiredPermissionForTab = (tab: string): keyof RolePermissions | null => {
    switch (tab) {
      case 'products':
      case 'pages':
      case 'reviews':
      case 'coupons':
      case 'social_marketing':
      case 'blogs':
        return 'productEdit';
      case 'inventory':
        return 'purchaseEntry';
      case 'orders':
        return 'orderProcess';
      case 'accounting':
        return 'accounts';
      case 'settings':
      case 'seo':
      case 'api_integration':
        return 'systemSettings';
      default:
        return null;
    }
  };

  const pendingChats = (state.supportChats || []).filter(c => c.status === 'pending').length;

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [{ id: 'dashboard', label: 'Analytics Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Commerce',
      items: [
        { id: 'products', label: 'Products Catalog', shortLabel: 'Products', icon: ShoppingBag },
        { id: 'inventory', label: 'Stock & Inventory', shortLabel: 'Inventory', icon: Archive },
        { id: 'orders', label: 'Orders Fulfillment', shortLabel: 'Orders', icon: ShoppingCart, badge: state.orders.length },
        { id: 'support_chats', label: 'Support Chats', shortLabel: 'Support', icon: MessageSquare, badge: pendingChats },
      ],
    },
    {
      title: 'Content & Marketing',
      items: [
        { id: 'pages', label: 'Page Builder', shortLabel: 'Pages', icon: Layers },
        { id: 'reviews', label: 'Review Moderation', shortLabel: 'Reviews', icon: Star },
        { id: 'coupons', label: 'Promo Coupons', shortLabel: 'Coupons', icon: Percent },
        { id: 'blogs', label: 'SEO Blog Writer', shortLabel: 'Blogs', icon: BookOpen },
        { id: 'social_marketing', label: 'Social Marketing', shortLabel: 'Social', icon: Share2 },
      ],
    },
    {
      title: 'Finance & System',
      items: [
        { id: 'accounting', label: 'Accounting Ledger', shortLabel: 'Accounting', icon: PieChart },
        { id: 'seo', label: 'SEO Auditor', shortLabel: 'SEO', icon: Sparkles },
        { id: 'api_integration', label: 'API Gateway', shortLabel: 'API', icon: Terminal },
        { id: 'settings', label: 'System Settings', shortLabel: 'Settings', icon: Settings },
      ],
    },
  ];

  const activeNavItem = navSections.flatMap(s => s.items).find(i => i.id === activeTab);

  const renderSidebarButton = (item: NavItem) => {
    const requiredPerm = getRequiredPermissionForTab(item.id);
    const isLocked = requiredPerm && !userPerms[requiredPerm];
    const isSelected = activeTab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => selectTab(item.id)}
        className={`admin-nav-item w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-lg transition-all duration-150 cursor-pointer border-0 ${
          isSelected ? 'admin-nav-item--active' : ''
        }`}
      >
        <span className="admin-nav-icon w-7 h-7 rounded-md flex items-center justify-center shrink-0">
          <item.icon className="w-[15px] h-[15px]" strokeWidth={2} />
        </span>
        <span className="flex-1 text-left truncate font-medium">{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="admin-nav-badge text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[1.1rem] text-center leading-none">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
        {isLocked && <Lock className="w-3 h-3 opacity-40 shrink-0" />}
      </button>
    );
  };

  const sidebarContent = (
    <>
      <div className="px-3 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-[#E91E63] text-white flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-white truncate block leading-tight">Koseli Xpress</span>
            <span className="text-[10px] text-white/40 block">Admin</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="admin-footer-btn lg:hidden p-2 rounded-lg transition"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 py-3 space-y-4 admin-sidebar-scroll">
        {navSections.map(section => (
          <div key={section.title}>
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(renderSidebarButton)}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 mb-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-[#E91E63]/40 border border-[#E91E63]/50 flex items-center justify-center shrink-0">
            <UserCircle2 className="w-5 h-5 text-pink-200" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-white/90 truncate">{currentUser.email}</p>
            <p className="text-[10px] text-pink-300/60 capitalize">{currentUser.role}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleLogout}
            className="admin-footer-btn flex-1 py-2 text-[11px] font-medium rounded-lg transition"
          >
            Switch account
          </button>
          <button
            type="button"
            onClick={onExitAdmin}
            className="admin-footer-btn px-3 py-2 rounded-lg transition"
            title="Exit to store"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  // Permissions validation checkers (for legacy compatibility)
  const hasPageBuilderAndSettingPerms = userPerms.productEdit;
  const isReadOnlyStaff = !userPerms.productEdit;

  const reqPerm = getRequiredPermissionForTab(activeTab);
  const hasAccess = !reqPerm || userPerms[reqPerm];

  return (
    <div className="flex h-[100dvh] bg-[#FFF5F8] overflow-hidden font-sans text-slate-800">
      <style>{`
        .admin-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(233, 30, 99, 0.45) rgba(255, 255, 255, 0.04);
        }
        .admin-sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .admin-sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 999px;
          margin: 6px 0;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(233, 30, 99, 0.4);
          border-radius: 999px;
        }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(233, 30, 99, 0.65);
        }

        .admin-sidebar .admin-nav-item {
          background: transparent !important;
          color: rgba(255, 255, 255, 0.55) !important;
          border: none !important;
          box-shadow: none !important;
        }
        .admin-sidebar .admin-nav-item:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: rgba(255, 255, 255, 0.92) !important;
        }
        .admin-sidebar .admin-nav-item--active {
          background: rgba(233, 30, 99, 0.35) !important;
          color: #ffffff !important;
          box-shadow: inset 3px 0 0 0 #E91E63 !important;
        }
        .admin-sidebar .admin-nav-item--active .admin-nav-icon {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
        }
        .admin-sidebar .admin-nav-icon {
          background: transparent !important;
          color: rgba(255, 255, 255, 0.45) !important;
        }
        .admin-sidebar .admin-nav-item:hover .admin-nav-icon {
          color: rgba(255, 255, 255, 0.85) !important;
        }
        .admin-sidebar .admin-nav-badge {
          background: rgba(233, 30, 99, 0.3) !important;
          color: #f9a8d4 !important;
        }
        .admin-sidebar .admin-nav-item--active .admin-nav-badge {
          background: rgba(255, 255, 255, 0.18) !important;
          color: #ffffff !important;
        }
        .admin-sidebar .admin-footer-btn {
          background: rgba(255, 255, 255, 0.06) !important;
          color: rgba(255, 255, 255, 0.75) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .admin-sidebar .admin-footer-btn:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #ffffff !important;
        }
      `}</style>

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar fixed lg:static inset-y-0 left-0 z-50 w-[min(100vw-3rem,16rem)] lg:w-56 xl:w-60 flex flex-col shrink-0 min-h-0 h-[100dvh] lg:h-auto overflow-hidden text-slate-100 border-r border-white/[0.06] transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'linear-gradient(180deg, #140810 0%, #1a0a12 50%, #120810 100%)' }}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 sm:h-16 bg-white/95 border-b border-slate-200/80 shrink-0 px-4 sm:px-6 flex items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-xl bg-pink-50 text-[#E91E63] hover:bg-pink-100 transition shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] truncate">
                {activeNavItem?.shortLabel || 'Admin'}
              </p>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeNavItem?.label || 'Command Center'}
              </h1>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 items-center shrink-0">
            <div className="hidden md:flex items-center gap-2 w-48 lg:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-400">
              <Search className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium truncate">Search workspace…</span>
            </div>
            {isReadOnlyStaff && (
              <span className="hidden sm:inline text-[9px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100">
                Read-only
              </span>
            )}
            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition border border-slate-200/80"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="hidden sm:inline-flex px-3 py-2 text-xs text-[#E91E63] font-bold bg-pink-50 hover:bg-pink-100 rounded-xl transition border border-pink-100"
            >
              Exit
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="sm:hidden p-2 rounded-xl bg-pink-50 text-[#E91E63]"
              title="Exit admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 pb-24 lg:pb-6 bg-[linear-gradient(180deg,#FFFBFC_0%,#FFF0F5_100%)]">
          {!hasAccess ? (
            <div className="max-w-md mx-auto my-12 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-xl shadow-slate-200/80">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-500">
                <Lock className="w-8 h-8 font-bold" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Workspace Authorization Denied</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Your current active profile role <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded uppercase font-bold text-[10px]">{currentUser.role}</span> does not have the necessary <strong>{reqPerm}</strong> permissions assigned to operate inside this section.
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2 text-xs">
                <div className="font-bold text-slate-700 text-xs">Required Grant Access:</div>
                <ul className="space-y-1.5 text-slate-600 font-semibold">
                  <li className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span>Permission Scope: <code className="font-mono text-rose-700 font-bold">{reqPerm}</code></span>
                  </li>
                  <li className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span>Status: <strong className="text-rose-700 font-extrabold text-[10px] uppercase">LOCKED / NO ASSIGNMENT</strong></span>
                  </li>
                </ul>
              </div>

              <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                Please contact our lead administrator <code className="font-mono text-slate-600">dinesh.dineshchalise@gmail.com</code> to override role permissions in the <strong>Admin System Settings → Invitations & Roles</strong> screen.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardTab 
                  state={state} 
                  onUpdateState={onUpdateState}
                  onSwitchTab={setActiveTab}
                />
              )}
              {activeTab === 'products' && (
                <ProductsTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.productEdit) { alert('Permission denied. Adding or editing products is not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.purchaseEntry) { alert('Permission denied. Warehousing and stock updates are not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'orders' && (
                <OrdersTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.orderProcess) { alert('Permission denied. Operational orders processing is not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'pages' && (
                <PagesTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.productEdit) { alert('Permission denied. Custom page configurations and touch designs are not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'reviews' && (
                <ReviewsTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.productEdit) { alert('Permission denied. User review moderation is not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'coupons' && (
                <CouponsTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.productEdit) { alert('Permission denied. Designing discount coupons is not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'accounting' && (
                <AccountingTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.accounts) { alert('Permission denied. Bookkeeping, ledger ledgers, and cash flow operations are not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'settings' && (
                <SettingsTab 
                  state={state} 
                  onUpdateState={(ns) => {
                    if (!userPerms.systemSettings) { alert('Requires Master Admin settings permission to modify configurations.'); return; }
                    onUpdateState(ns);
                  }} 
                />
              )}
              {activeTab === 'seo' && (
                <SEOTab 
                  state={state}
                  onUpdateState={(ns) => {
                    if (!userPerms.systemSettings) { alert('Permission denied. Editing metadata and global SEO metrics is not allowed under your current permissions.'); return; }
                    onUpdateState(ns);
                  }}
                  onSwitchTab={setActiveTab}
                />
              )}
              {activeTab === 'api_integration' && (
                <APIIntegrationTab 
                  state={state}
                  onUpdateState={(ns) => {
                    if (!userPerms.systemSettings) { alert('Permission denied. API integrations require Super Admin settings permission.'); return; }
                    onUpdateState(ns);
                  }}
                />
              )}
              {activeTab === 'social_marketing' && (
                <SocialMarketingTab 
                  state={state}
                  onUpdateState={(ns) => {
                    if (!userPerms.productEdit) { alert('Permission denied. Social media scheduling requires product edit permissions.'); return; }
                    onUpdateState(ns);
                  }}
                />
              )}
              {activeTab === 'blogs' && (
                <BlogWriterTab 
                  state={state}
                  onUpdateState={(ns) => {
                    if (!userPerms.productEdit) { alert('Permission denied. Blog writing requires product edit permissions.'); return; }
                    onUpdateState(ns);
                  }}
                />
              )}
              {activeTab === 'support_chats' && (
                <SupportChatsTab 
                  state={state}
                  onUpdateState={onUpdateState}
                />
              )}
            </>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 shadow-[0_-4px_24px_rgba(233,30,99,0.08)]">
        <div className="flex justify-around gap-0.5 max-w-lg mx-auto">
          {navSections.flatMap(s => s.items).slice(0, 4).map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`relative flex flex-col items-center gap-0.5 flex-1 max-w-[5rem] px-1 py-1.5 rounded-xl transition ${
                  isActive ? 'text-[#E91E63]' : 'text-slate-400'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#E91E63]" />
                )}
                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#E91E63]' : ''}`} />
                <span className="text-[9px] font-semibold truncate w-full text-center">{item.shortLabel}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-col items-center gap-0.5 flex-1 max-w-[5rem] px-1 py-1.5 rounded-xl text-slate-400"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-semibold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
