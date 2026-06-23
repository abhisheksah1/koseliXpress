import React, { useState } from 'react';
import { DatabaseState, UserRole, Role, RolePermissions } from '../../types';
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
  ChevronRight,
  PieChart,
  Sparkles,
  Terminal,
  Share2,
  BookOpen,
  MessageSquare
} from 'lucide-react';

interface AdminPanelProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
  onExitAdmin: () => void;
}

export default function AdminPanel({ state, onUpdateState, onExitAdmin }: AdminPanelProps) {
  // Login Guard block
  const [currentUser, setCurrentUser] = useState<UserRole | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'inventory' | 'orders' | 'pages' | 'reviews' | 'coupons' | 'settings' | 'accounting' | 'seo' | 'api_integration' | 'social_marketing' | 'blogs' | 'support_chats'>('dashboard');

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
    const matchedUser = state.users.find(u => 
      u.email.toLowerCase() === emailInput.trim().toLowerCase() && 
      (u.password === passwordInput || u.passcode === passwordInput)
    );
    
    if (matchedUser) {
      if (matchedUser.status === 'inactive') {
        setErrorMessage('Access Denied: Your account standing is INACTIVE. Please contact your administrator.');
        return;
      }
      setCurrentUser(matchedUser);
      setErrorMessage('');
    } else {
      setErrorMessage('Access Denied: Incorrect Gmail or password.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmailInput('');
    setPasswordInput('');
    setErrorMessage('');
  };

  // Guard Screen visual
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        {/* Anti-AI Slop minimal wrapper */}
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-rose-600/10 rounded-xl flex items-center justify-center mx-auto text-rose-500">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-slate-100 font-sans tracking-tight">Super Admin Authentication</h1>
            <p className="text-xs text-slate-400">Please enter your registered Gmail and password to access the system.</p>
          </div>

          <form onSubmit={handleVerifyDirect} className="space-y-4 text-left">
            <div className="space-y-3.5 text-left text-xs animate-in fade-in duration-250">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Gmail Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-700 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Passphrase Secret</label>
                <input
                  type="password"
                  required
                  placeholder="Enter account security password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-700 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/40 p-2.5 rounded-lg text-center font-bold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-md shadow-rose-600/10"
            >
              Sign In to Dashboard 🛡️
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onExitAdmin}
              className="text-xs font-semibold text-rose-500 hover:text-rose-400 hover:underline transition"
            >
              ← Back to Customer Front Store
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

  const renderSidebarButton = (tab: string, label: string, IconComponent: React.ComponentType<any>) => {
    const requiredPerm = getRequiredPermissionForTab(tab);
    const isLocked = requiredPerm && !userPerms[requiredPerm];
    const isSelected = activeTab === tab;

    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
          isSelected 
            ? 'bg-rose-600 text-white shadow-xs font-bold' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <IconComponent className="w-4 h-4" />
          <span>{label}</span>
        </div>
        {isLocked && (
          <span className="flex items-center gap-1 text-[9px] uppercase font-mono bg-slate-950 text-rose-455 px-1.5 py-0.5 rounded font-extrabold border border-rose-500/10 shrink-0">
            <Lock className="w-2.5 h-2.5" /> Lock
          </span>
        )}
      </button>
    );
  };

  // Permissions validation checkers (for legacy compatibility)
  const hasPageBuilderAndSettingPerms = userPerms.productEdit;
  const isReadOnlyStaff = !userPerms.productEdit;

  const reqPerm = getRequiredPermissionForTab(activeTab);
  const hasAccess = !reqPerm || userPerms[reqPerm];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 text-slate-100 border-r border-slate-805">
        
        {/* Sidebar Brand header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-rose-500 tracking-widest block font-mono">WORKSPACE</span>
            <span className="text-sm font-bold text-slate-200 uppercase">Koseli Xpress Adms</span>
          </div>
          <span className="p-1 bg-rose-600/10 rounded-lg text-rose-500">
            <ShieldCheck className="w-4 h-4" />
          </span>
        </div>

        {/* Sidebar links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {renderSidebarButton('dashboard', 'KPI Analytics Dashboard', LayoutDashboard)}
          {renderSidebarButton('products', 'Catalog Products Registry', ShoppingBag)}
          {renderSidebarButton('inventory', 'Warehouse Stock Logs', Archive)}
          {renderSidebarButton('orders', `Operational Orders (${state.orders.length})`, ShoppingCart)}
          {renderSidebarButton('support_chats', `AI Support Chats (${(state.supportChats || []).filter(c => c.status === 'pending').length})`, MessageSquare)}
          {renderSidebarButton('pages', 'Gifting Touch Page Builder', Layers)}
          {renderSidebarButton('reviews', 'Customer Review Moderation', Star)}
          {renderSidebarButton('coupons', 'Discount Promo Coupons', Percent)}
          {renderSidebarButton('accounting', 'Bookkeeping & PL Ledger', PieChart)}
          {renderSidebarButton('seo', 'SEO Global Auditor', Sparkles)}
          {renderSidebarButton('social_marketing', 'AI Social Marketing', Share2)}
          {renderSidebarButton('blogs', 'AI SEO Blog Writer', BookOpen)}
          {renderSidebarButton('api_integration', 'API Order Gateway', Terminal)}
          {renderSidebarButton('settings', 'Admin System Settings', Settings)}
        </nav>

        {/* User context footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-805 space-y-2">
          <div className="text-xs">
            <span className="text-[10px] text-slate-500 block">AUTHORIZED AS:</span>
            <div className="font-bold text-slate-350 truncate">{currentUser.email}</div>
            <div className="text-[9px] uppercase font-mono font-extrabold text-rose-500 mt-0.5 mt-0.5">{currentUser.role} permissions</div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleLogout}
              className="flex-1 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-350 text-[10px] font-bold rounded-md transition text-center cursor-pointer"
            >
              Change Role
            </button>
            <button
              onClick={onExitAdmin}
              className="px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition cursor-pointer"
              title="Return to Customer Store"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Primary Work area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header line */}
        <header className="h-16 bg-white border-b border-slate-100 shrink-0 px-6 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500">
            Logged session: <span className="font-mono text-rose-600">{currentUser.email}</span>
          </div>

          <div className="flex gap-3 items-center">
            {isReadOnlyStaff && (
              <span className="text-[10px] font-extrabold uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded tracking-wide font-sans">Staff Read-Only View</span>
            )}
            <button
              onClick={onExitAdmin}
              className="px-3.5 py-1.5 text-xs text-rose-700 font-semibold bg-rose-50 hover:bg-rose-100/80 rounded-lg transition"
            >
              Close Workspace
            </button>
          </div>
        </header>

        {/* Dynamic sub tab rendering */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!hasAccess ? (
            <div className="max-w-md mx-auto my-12 text-center bg-white border border-slate-150 rounded-2xl p-8 space-y-6 shadow-xs">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 text-rose-500">
                <Lock className="w-8 h-8 font-bold" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Workspace Authorization Denied</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Your current active profile role <span className="font-mono bg-slate-100 text-slate-705 px-1.5 py-0.5 rounded uppercase font-bold text-[10px]">{currentUser.role}</span> does not have the necessary <strong>{reqPerm}</strong> permissions assigned to operate inside this section.
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 text-left space-y-2 text-xs">
                <div className="font-bold text-slate-750 text-xs text-slate-700">Required Grant Access:</div>
                <ul className="space-y-1.5 text-slate-600 font-semibold">
                  <li className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span>Permission Scope: <code className="font-mono text-rose-700 font-bold">{reqPerm}</code></span>
                  </li>
                  <li className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span>Status: <strong className="text-rose-650 font-extrabold text-[10px] uppercase">LOCKED / NO ASSIGNMENT</strong></span>
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
    </div>
  );
}
