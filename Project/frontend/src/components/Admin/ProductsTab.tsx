import React, { useState, useTransition } from 'react';
import { DatabaseState, Product, ProductStatus, Category, Brand } from '../../types';
import { Plus, Edit3, Trash2, FileOutput, FileInput, Sparkles, AlertCircle, ShoppingBag, Layers, HelpCircle, Check, Loader2, Upload, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { exportProductsToCSV, parseProductsFromCSV, triggerCSVDownload } from '../CSVHelper';
import SEOAssistantWidget from './SEOAssistantWidget';
import { getProductStock } from '../../utils/stockUtils';
import {
  AdminSelect,
  AdminInput,
  AdminTextarea,
  AdminSection,
  AdminPrimaryButton,
  AdminGhostButton,
  AdminCatalogStyles,
} from './AdminFormControls';

interface ProductsTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function ProductsTab({ state, onUpdateState }: ProductsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'brands'>('products');
  const [stockFilter, setStockFilter] = useState<'all' | 'normal' | 'out_of_stock' | 'out_of_stock_orderable'>('all');
  const [compositionFilter, setCompositionFilter] = useState<'all' | 'standalone' | 'hamper'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
  const [editCategory, setEditCategory] = useState<Partial<Category> | null>(null);
  const [editBrand, setEditBrand] = useState<Partial<Brand> | null>(null);
  const [search, setSearch] = useState('');
  const [hamperSearchQuery, setHamperSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [productPage, setProductPage] = useState(1);
  const productsPerPage = 50;

  React.useEffect(() => {
    setProductPage(1);
  }, [search, selectedCat, stockFilter, compositionFilter, statusFilter]);

  const productMatchesCategory = (product: Product, categoryId: string) => {
    return product.categoryId === categoryId || !!product.categoryIds?.includes(categoryId);
  };

  const handleBulkAction = (action: 'publish' | 'draft' | 'delete') => {
    if (selectedProductIds.length === 0) return;
    
    let confirmMsg = '';
    if (action === 'delete') {
      confirmMsg = `Are you sure you want to delete the ${selectedProductIds.length} selected products? This action can't be undone.`;
    } else if (action === 'draft') {
      confirmMsg = `Change status to draft for ${selectedProductIds.length} products?`;
    } else {
      confirmMsg = `Publish ${selectedProductIds.length} products to active status?`;
    }

    let confirmed = false;
    try {
      confirmed = window.confirm(confirmMsg);
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }

    if (confirmed) {
      const list = [...state.products];
      let updatedCount = 0;
      selectedProductIds.forEach(id => {
        const idx = list.findIndex(prod => prod.id === id);
        if (idx !== -1) {
          if (action === 'delete') {
            list[idx] = { ...list[idx], status: ProductStatus.DELETED };
          } else if (action === 'draft') {
            list[idx] = { ...list[idx], status: ProductStatus.DRAFT };
          } else if (action === 'publish') {
            list[idx] = { ...list[idx], status: ProductStatus.ACTIVE };
          }
          updatedCount++;
        }
      });
      onUpdateState({ ...state, products: list });
      setSelectedProductIds([]);
      alert(`Successfully performed bulk ${action} on ${updatedCount} products.`);
    }
  };

  // Stock Adjustment states
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'writeoff' | 'override'>('add');
  const [adjustmentQty, setAdjustmentQty] = useState<number | ''>('');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');

  // CSV Import state
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  // Dynamic placements states
  const [selectedMenuId, setSelectedMenuId] = useState<string>('main');
  const [categoryToAddToMenu, setCategoryToAddToMenu] = useState<string>('');

  // --- CSV Import/Export handlers ---
  const handleExportCSV = () => {
    const csv = exportProductsToCSV(state.products.filter(p => p.status !== ProductStatus.DELETED));
    triggerCSVDownload(csv, 'koseli_xpress_catalog_export.csv');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const { products: imported, newCategories, warnings } = parseProductsFromCSV(text, state.categories || []);
        if (imported.length === 0) {
          setImportFeedback('No valid products found in CSV file.');
          setImportWarnings(warnings || []);
          return;
        }

        const updatedProducts = [...state.products];
        imported.forEach(imp => {
          // Check if SKU or ID matches to overwrite, else append
          const matchIdx = updatedProducts.findIndex(p => p.status !== ProductStatus.DELETED && (p.id === imp.id || p.sku === imp.sku));
          if (matchIdx >= 0) {
            updatedProducts[matchIdx] = { ...updatedProducts[matchIdx], ...imp };
          } else {
            updatedProducts.push(imp);
          }
        });

        const updatedCategories = [...(state.categories || [])];
        newCategories.forEach(newCat => {
          if (!updatedCategories.some(c => c.id === newCat.id || c.name.toLowerCase() === newCat.name.toLowerCase())) {
            updatedCategories.push(newCat);
          }
        });

        onUpdateState({
          ...state,
          products: updatedProducts,
          categories: updatedCategories
        });
        
        let feedback = `Successfully imported/updated ${imported.length} products!`;
        if (newCategories.length > 0) {
          feedback += ` Created ${newCategories.length} new categories automatically: ${newCategories.map(c => c.name).join(', ')}`;
        }
        setImportFeedback(feedback);
        setImportWarnings(warnings || []);
        
        // Auto-dismiss feedback after some time ONLY if there are no validation warnings to read
        if (!warnings || warnings.length === 0) {
          setTimeout(() => setImportFeedback(null), 8500);
        }
      } catch (err) {
        setImportFeedback('Failed to parse CSV. Please check formatting standard.');
        setImportWarnings([String(err)]);
      }
    };
    reader.readAsText(file);
  };

  // --- SEO AI Autocompletion handler ---
  const handleGenerateSEO = async (type: 'product' | 'category' | 'brand', name: string, desc: string, setter: (title: string, desc: string, keys: string) => void) => {
    if (!name) {
      alert('Please enter a name first to assist the AI model.');
      return;
    }
    setAiGenerating(true);
    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, description: desc })
      });
      const data = await response.json();
      setter(data.metaTitle || '', data.metaDescription || '', data.metaKeywords || '');
    } catch (e) {
      console.error(e);
      alert('SEO auto-generation failed. Custom backup applied.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Filter products
  const filteredProducts = state.products.filter(p => {
    if (p.status === ProductStatus.DELETED) return false;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat ? productMatchesCategory(p, selectedCat) : true;
    
    // Evaluate actual stock status
    const actualStock = p.isHamper ? getProductStock(p, state.products) : p.stock;
    const isActuallyOutOfStock = actualStock <= 0;

    let matchesStock = true;
    if (stockFilter === 'normal') {
      matchesStock = !isActuallyOutOfStock;
    } else if (stockFilter === 'out_of_stock') {
      matchesStock = isActuallyOutOfStock;
    } else if (stockFilter === 'out_of_stock_orderable') {
      matchesStock = isActuallyOutOfStock && !!p.allowOrderWhenOutOfStock;
    }

    // Evaluate composition status
    let matchesComposition = true;
    if (compositionFilter === 'standalone') {
      matchesComposition = !p.isHamper;
    } else if (compositionFilter === 'hamper') {
      matchesComposition = !!p.isHamper;
    }

    // Evaluate publishing status
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = p.status === ProductStatus.ACTIVE;
    } else if (statusFilter === 'draft') {
      matchesStatus = p.status === ProductStatus.DRAFT;
    }

    return matchesSearch && matchesCat && matchesStock && matchesComposition && matchesStatus;
  });

  const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * productsPerPage,
    productPage * productsPerPage
  );

  // Selected list toggle helpers
  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = paginatedProducts.map(p => p.id);
    const allVisibleSelected = visibleIds.every(id => selectedProductIds.includes(id));
    if (allVisibleSelected) {
      setSelectedProductIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedProductIds(prev => {
        const union = new Set([...prev, ...visibleIds]);
        return Array.from(union);
      });
    }
  };

  // Active catalog inventory summary report
  const activeProducts = state.products.filter(p => p.status !== ProductStatus.DELETED);
  const normalStockCount = activeProducts.filter(p => {
    const actualStock = p.isHamper ? getProductStock(p, state.products) : p.stock;
    return actualStock > 0;
  }).length;
  const outOfStockCount = activeProducts.filter(p => {
    const actualStock = p.isHamper ? getProductStock(p, state.products) : p.stock;
    return actualStock <= 0;
  }).length;
  const outOfStockOrderableCount = activeProducts.filter(p => {
    const actualStock = p.isHamper ? getProductStock(p, state.products) : p.stock;
    return actualStock <= 0 && p.allowOrderWhenOutOfStock;
  }).length;

  const statCardActive = 'bg-gradient-to-br from-[#E91E63] to-[#C2185B] border-[#E91E63] text-white shadow-lg shadow-pink-900/20 scale-[1.01]';
  const statCardIdle = 'bg-white border-pink-100/80 text-slate-700 hover:border-pink-200 hover:shadow-md';

  return (
    <div className="space-y-6 admin-catalog-root">
      <AdminCatalogStyles />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-pink-100/80 text-[#E91E63] text-[10px] font-bold uppercase tracking-widest mb-2">
            <ShoppingBag className="w-3.5 h-3.5" /> Product Catalog
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Catalog Registry</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage products, gift hampers, categories and brands with premium storefront controls.</p>
        </div>

        {/* Global tab switches */}
        <div className="flex gap-1 p-1 bg-pink-50/80 border border-pink-100 rounded-xl shadow-inner">
          <button
            onClick={() => { setActiveSubTab('products'); setEditProduct(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'products' ? 'admin-catalog-tab-active' : 'text-slate-500 hover:text-[#E91E63] hover:bg-white/60'}`}
          >
            <ShoppingBag className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Products
          </button>
          <button
            onClick={() => { setActiveSubTab('categories'); setEditCategory(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'categories' ? 'admin-catalog-tab-active' : 'text-slate-500 hover:text-[#E91E63] hover:bg-white/60'}`}
          >
            <Layers className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Categories
          </button>
          <button
            onClick={() => { setActiveSubTab('brands'); setEditBrand(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'brands' ? 'admin-catalog-tab-active' : 'text-slate-500 hover:text-[#E91E63] hover:bg-white/60'}`}
          >
            <Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Brands
          </button>
        </div>
      </div>

      {(importFeedback || importWarnings.length > 0) && (
        <div className="space-y-2 mb-4">
          {importFeedback && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2.5 shadow-xs">
              <span className="text-emerald-650 mt-0.5 leading-none text-sm font-bold">✓</span>
              <div className="flex-1 col-span-1">
                <p className="font-extrabold text-emerald-900 mb-0.5">Import Process Completed</p>
                <p className="text-[11px] text-emerald-700">{importFeedback}</p>
              </div>
              <button 
                onClick={() => { setImportFeedback(null); setImportWarnings([]); }}
                className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer text-[10px] uppercase font-mono tracking-wider transition"
              >
                Dismiss
              </button>
            </div>
          )}
          
          {importWarnings.length > 0 && (
            <div className="p-4 bg-amber-50/50 border border-amber-200 text-amber-900 rounded-xl text-xs shadow-xs">
              <div className="flex justify-between items-start mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-150 text-amber-805 text-[10px] font-extrabold font-mono tracking-wider rounded uppercase border border-amber-200">Basic Validation Reports ({importWarnings.length})</span>
                </div>
                {!importFeedback && (
                  <button 
                    onClick={() => { setImportFeedback(null); setImportWarnings([]); }}
                    className="text-amber-600 hover:text-amber-800 font-bold cursor-pointer text-[10px] uppercase font-mono tracking-wider transition"
                  >
                    Dismiss
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-amber-200 pr-1 select-text">
                {importWarnings.map((warning, idx) => (
                  <div key={idx} className="flex gap-2 items-start font-mono text-[11px] leading-relaxed text-slate-600">
                    <span className="text-amber-500 font-extrabold select-none">•</span>
                    <span className="flex-1">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRODUCTS TAB SECTION */}
      {activeSubTab === 'products' && (
        <>
          {!editProduct ? (
            <div className="space-y-4">
              {/* Inventory Status Report Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                    stockFilter === 'all' ? statCardActive : statCardIdle
                  }`}
                >
                  <span className={`text-[10px] block font-bold uppercase tracking-widest leading-none mb-1.5 ${stockFilter === 'all' ? 'text-pink-200' : 'text-slate-400'}`}>Total Items</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black font-mono leading-none">{activeProducts.length}</span>
                    <span className={`text-[10px] font-bold font-mono ${stockFilter === 'all' ? 'text-pink-200' : 'text-slate-500'}`}>Active Catalog</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStockFilter('normal')}
                  className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                    stockFilter === 'normal' ? statCardActive : statCardIdle
                  }`}
                >
                  <span className={`text-[10px] block font-bold uppercase tracking-widest leading-none mb-1.5 ${stockFilter === 'normal' ? 'text-pink-200' : 'text-slate-400'}`}>Normal Stock</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black font-mono leading-none">{normalStockCount}</span>
                    <span className={`text-[10px] font-bold font-mono ${stockFilter === 'normal' ? 'text-emerald-200' : 'text-emerald-500'}`}>In Stock</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStockFilter('out_of_stock')}
                  className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                    stockFilter === 'out_of_stock' ? statCardActive : statCardIdle
                  }`}
                >
                  <span className={`text-[10px] block font-bold uppercase tracking-widest leading-none mb-1.5 ${stockFilter === 'out_of_stock' ? 'text-pink-200' : 'text-slate-400'}`}>Out of Stock</span>
                  <div className="flex justify-between items-baseline">
                    <span className={`text-2xl font-black font-mono leading-none ${stockFilter === 'out_of_stock' ? 'text-rose-200' : 'text-rose-600'}`}>{outOfStockCount}</span>
                    <span className={`text-[10px] font-bold font-mono ${stockFilter === 'out_of_stock' ? 'text-rose-200' : 'text-rose-500'}`}>Sold Out</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStockFilter('out_of_stock_orderable')}
                  className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
                    stockFilter === 'out_of_stock_orderable' ? statCardActive : statCardIdle
                  }`}
                >
                  <span className={`text-[10px] block font-bold uppercase tracking-widest leading-none mb-1.5 ${stockFilter === 'out_of_stock_orderable' ? 'text-pink-200' : 'text-slate-400'}`}>Orderable Overrides</span>
                  <div className="flex justify-between items-baseline">
                    <span className={`text-2xl font-black font-mono leading-none ${stockFilter === 'out_of_stock_orderable' ? 'text-violet-200' : 'text-violet-600'}`}>{outOfStockOrderableCount}</span>
                    <span className={`text-[10px] font-bold font-mono ${stockFilter === 'out_of_stock_orderable' ? 'text-violet-200' : 'text-violet-500'}`}>Override ON</span>
                  </div>
                </button>
              </div>

              {/* Dynamic Bulk Action Bar */}
              {selectedProductIds.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600/10 rounded-lg text-rose-500">
                      <Layers className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-sm text-slate-100 font-sans block">
                        {selectedProductIds.length} {selectedProductIds.length === 1 ? 'Product' : 'Products'} Selected
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Select bulk action style to modify all items in catalog.
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkAction('publish')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" /> Publish Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('draft')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Draft Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('delete')}
                      className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProductIds([])}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-gradient-to-r from-white via-pink-50/30 to-white border border-pink-100/80 rounded-2xl shadow-sm">
                <div className="flex flex-wrap gap-2.5 w-full lg:w-4/5 items-end">
                  <AdminInput
                    className="min-w-[160px] flex-1"
                    placeholder="Search by name, slug or SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <AdminSelect
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                    className="min-w-[150px]"
                  >
                    <option value="">All Categories</option>
                    {state.categories.map((c, idx) => (
                      <option key={`filter-cat-${c.id || idx}`} value={c.id}>{c.name}</option>
                    ))}
                  </AdminSelect>
                  <AdminSelect
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
                    className="min-w-[150px]"
                  >
                    <option value="all">All Stocks</option>
                    <option value="normal">In Stock Only</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="out_of_stock_orderable">Out of Stock (Orderable)</option>
                  </AdminSelect>
                  <AdminSelect
                    value={compositionFilter}
                    onChange={(e) => setCompositionFilter(e.target.value as typeof compositionFilter)}
                    className="min-w-[155px]"
                  >
                    <option value="all">All Compositions</option>
                    <option value="standalone">Standalone Items</option>
                    <option value="hamper">Gift Hampers</option>
                  </AdminSelect>
                  <AdminSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="min-w-[150px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active / Published</option>
                    <option value="draft">Draft / Secret</option>
                  </AdminSelect>
                  {(selectedCat || stockFilter !== 'all' || compositionFilter !== 'all' || statusFilter !== 'all' || search) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCat('');
                        setStockFilter('all');
                        setCompositionFilter('all');
                        setStatusFilter('all');
                        setSearch('');
                      }}
                      className="px-3.5 py-2.5 text-xs font-bold text-[#E91E63] hover:bg-pink-50 rounded-xl border border-pink-200 cursor-pointer transition shrink-0"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-end w-full lg:w-1/5 shrink-0">
                  <AdminGhostButton onClick={handleExportCSV} className="!py-2">
                    <FileOutput className="w-4 h-4" /> Export
                  </AdminGhostButton>
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-pink-200 hover:bg-pink-50/50 rounded-xl transition cursor-pointer">
                    <FileInput className="w-4 h-4" /> Import
                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                  </label>
                  <AdminPrimaryButton
                    onClick={() => setEditProduct({
                      id: `prod-${Math.floor(Math.random() * 90000 + 10000)}`,
                      name: '',
                      slug: '',
                      sku: `SKU-${Math.floor(Math.random() * 89999 + 10000)}`,
                      price: 1000,
                      costPrice: 500,
                      stock: 10,
                      lowStockThreshold: 3,
                      categoryId: state.categories[0]?.id || '',
                      brandId: state.brands[0]?.id || '',
                      deliveryGroupId: '',
                      deliveryGroupIds: [],
                      description: '',
                      images: ['https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'],
                      isHamper: false,
                      hamperItems: [],
                      allowCakeMessage: false,
                      allowGiftMessage: false,
                      allowPhotoUpload: false,
                      allowOrderWhenOutOfStock: false,
                      status: ProductStatus.ACTIVE,
                      metaTitle: '',
                      metaDescription: '',
                      metaKeywords: ''
                    })}
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </AdminPrimaryButton>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-pink-100/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-gradient-to-r from-pink-50/80 to-white border-b border-pink-100 text-[#E91E63]/70 font-bold text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 w-11 text-center select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.includes(p.id))}
                            onChange={toggleSelectAll}
                            title="Select / Deselect all visible on this page"
                          />
                        </th>
                        <th className="py-3 px-4">SKU / Item</th>
                        <th className="py-3 px-4">Catalog Section</th>
                        <th className="py-3 px-4 text-right">Standard Rate</th>
                        <th className="py-3 px-4 text-center">Remaining Stock</th>
                        <th className="py-3 px-4 text-center">Composition</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedProducts.map(p => {
                        const cat = state.categories.find(c => c.id === p.categoryId);
                        const actualStock = p.isHamper ? getProductStock(p, state.products) : p.stock;
                        const isLow = actualStock <= p.lowStockThreshold;
                        const isRowSelected = selectedProductIds.includes(p.id);
                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${isRowSelected ? 'bg-rose-50/20 hover:bg-rose-50/30' : ''}`}>
                            <td className="py-3.5 px-4 text-center select-none">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
                                checked={isRowSelected}
                                onChange={() => toggleSelectProduct(p.id)}
                              />
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs">
                              <span className="text-slate-400 font-bold block">{p.sku}</span>
                              <span className="text-slate-800 font-semibold font-sans text-sm block">{p.name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">
                              {cat ? cat.name : 'Unknown Category'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                              Rs. {p.price.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center gap-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                                <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${isLow ? 'bg-rose-50 text-rose-600 font-mono' : 'bg-slate-100 text-slate-700 font-mono'}`}>
                                  {actualStock} units
                                </span>
                                {p.isHamper && (
                                  <span className="text-[9px] font-bold text-violet-500 uppercase font-mono">Dependent</span>
                                )}
                                {p.allowOrderWhenOutOfStock && (
                                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded uppercase leading-none" title="Orders Allowed Despite Stock = 0">
                                    Override: On
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustingProduct(p);
                                    setAdjustmentType('add');
                                    setAdjustmentQty('');
                                    setAdjustmentNote('');
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer select-none leading-none hover:text-indigo-600 hover:border-indigo-200 transition"
                                >
                                  Adjust
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {p.isHamper ? (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider bg-violet-100 text-violet-700 uppercase rounded">Hamper Combo</span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider bg-slate-100 text-slate-400 uppercase rounded">Individual</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center text-xs">
                              <button
                                onClick={() => {
                                  const list = [...state.products];
                                  const idx = list.findIndex(prod => prod.id === p.id);
                                  list[idx].status = p.status === ProductStatus.ACTIVE ? ProductStatus.DRAFT : ProductStatus.ACTIVE;
                                  onUpdateState({ ...state, products: list });
                                }}
                                className={`px-2 py-1 font-bold rounded-md uppercase cursor-pointer ${p.status === ProductStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                              >
                                {p.status === ProductStatus.ACTIVE ? 'Published' : 'Draft / Secret'}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  const randId = Math.floor(Math.random() * 900 + 100);
                                  const duplicated: Product = {
                                    ...p,
                                    id: `prod-dup-${Date.now()}-${randId}`,
                                    sku: `${p.sku}-DUP-${randId}`,
                                    name: `${p.name} (Duplicate)`,
                                    status: ProductStatus.DRAFT,
                                  };
                                  const list = [...state.products, duplicated];
                                  onUpdateState({ ...state, products: list });
                                  alert(`Successfully Duplicated ${p.name}! Created copy SKU is "${duplicated.sku}" in Unpublished Draft status.`);
                                }}
                                className="p-1 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-md transition inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
                                title="Duplicate this product catalog entry"
                              >
                                Clone
                              </button>
                              <button
                                onClick={() => setEditProduct(p)}
                                className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-md transition inline-flex items-center gap-1 text-xs"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  let confirmed = false;
                                  try {
                                    confirmed = window.confirm(`Mark ${p.name} as deleted?`);
                                  } catch (e) {
                                    confirmed = true;
                                  }
                                  if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
                                    confirmed = true;
                                  }
                                  if (confirmed) {
                                    const list = [...state.products];
                                    const idx = list.findIndex(prod => prod.id === p.id);
                                    if (idx !== -1) {
                                      list[idx] = { ...list[idx], status: ProductStatus.DELETED };
                                      onUpdateState({ ...state, products: list });
                                    }
                                  }
                                }}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition inline-flex items-center"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalProductPages > 1 && (
                  <div className="bg-slate-50 border-t border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                    <div>
                      Showing <strong className="text-slate-800">{Math.min(filteredProducts.length, (productPage - 1) * productsPerPage + 1)}-{Math.min(filteredProducts.length, productPage * productsPerPage)}</strong> of <strong className="text-slate-800">{filteredProducts.length}</strong> products
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        disabled={productPage === 1}
                        onClick={() => setProductPage(1)}
                        className="p-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                      >
                        First
                      </button>
                      <button
                        type="button"
                        disabled={productPage === 1}
                        onClick={() => setProductPage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="px-3 py-1 font-bold text-slate-800 bg-white/50 border border-slate-200 rounded">
                        {productPage} / {totalProductPages}
                      </span>
                      <button
                        type="button"
                        disabled={productPage === totalProductPages}
                        onClick={() => setProductPage(prev => Math.min(totalProductPages, prev + 1))}
                        className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        disabled={productPage === totalProductPages}
                        onClick={() => setProductPage(totalProductPages)}
                        className="p-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-pink-100/80 bg-gradient-to-br from-white via-pink-50/20 to-white p-6 sm:p-8 space-y-6 shadow-lg shadow-pink-900/5">
              {/* Product form editor including combo hamper builder */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-pink-100/60">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E91E63]/10 text-[#E91E63] text-[10px] font-bold uppercase tracking-widest mb-2">
                    {editProduct.name ? 'Edit Product' : 'New Product'}
                  </span>
                  <h4 className="font-bold text-slate-800 text-xl tracking-tight">
                    {editProduct.name ? `Modify ${editProduct.name}` : 'Create Brand-New Catalog Product'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Fill in product details, pricing, inventory and SEO settings below.</p>
                </div>
                <AdminGhostButton onClick={() => setEditProduct(null)}>
                  Back to List
                </AdminGhostButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visuals & Essentials */}
                <AdminSection title="Product Essentials" subtitle="Core identity, pricing and inventory">
                <div className="space-y-4">
                  <AdminInput
                    label="Product Title"
                    required
                    type="text"
                    value={editProduct.name || ''}
                    onChange={(e) => {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      setEditProduct({ ...editProduct, name: e.target.value, slug });
                    }}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <AdminInput
                      label="Unique SKU"
                      required
                      mono
                      type="text"
                      value={editProduct.sku || ''}
                      onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })}
                    />
                    <AdminInput
                      label="Slug Handle"
                      mono
                      type="text"
                      value={editProduct.slug || ''}
                      onChange={(e) => setEditProduct({ ...editProduct, slug: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <AdminInput
                      label="Original Price (NPR)"
                      mono
                      type="number"
                      value={editProduct.price || 0}
                      onChange={(e) => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 })}
                    />
                    <AdminInput
                      label="Discount Price (NPR)"
                      mono
                      type="number"
                      value={editProduct.discountPrice || ''}
                      onChange={(e) => setEditProduct({ ...editProduct, discountPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Optional sale price"
                      className="[&_input]:border-pink-200 [&_input]:bg-pink-50/30 [&_input]:text-[#E91E63]"
                    />
                    <AdminInput
                      label="Cost Price (NPR)"
                      mono
                      type="number"
                      value={editProduct.costPrice || 0}
                      onChange={(e) => setEditProduct({ ...editProduct, costPrice: parseFloat(e.target.value) || 0 })}
                      placeholder="For profit margins"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <AdminInput
                      label="Remaining Stock"
                      mono
                      type="number"
                      value={editProduct.stock || 0}
                      onChange={(e) => setEditProduct({ ...editProduct, stock: parseInt(e.target.value) || 0 })}
                    />
                    <AdminInput
                      label="Low Stock Warning"
                      mono
                      type="number"
                      value={editProduct.lowStockThreshold || 3}
                      onChange={(e) => setEditProduct({ ...editProduct, lowStockThreshold: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                </div>
                </AdminSection>

                <AdminSection title="Catalog & Delivery" subtitle="Categories, brand, status and delivery groups">
                <div className="space-y-4">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">Publish on Categories</label>
                      <div className="max-h-28 overflow-y-auto p-3.5 border border-pink-100 bg-white rounded-xl grid grid-cols-2 gap-2 text-left shadow-inner">
                        {state.categories.map(c => {
                          const isChecked = editProduct.categoryId === c.id || (editProduct.categoryIds && editProduct.categoryIds.includes(c.id));
                          return (
                            <label key={c.id} className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!isChecked}
                                onChange={(e) => {
                                  let currentIds = editProduct.categoryIds ? [...editProduct.categoryIds] : [];
                                  if (editProduct.categoryId && !currentIds.includes(editProduct.categoryId)) {
                                    currentIds.unshift(editProduct.categoryId);
                                  }

                                  if (e.target.checked) {
                                    if (!currentIds.includes(c.id)) {
                                      currentIds.push(c.id);
                                    }
                                  } else {
                                    currentIds = currentIds.filter(id => id !== c.id);
                                  }

                                  const nextPrimaryId = currentIds.includes(editProduct.categoryId || '')
                                    ? editProduct.categoryId
                                    : (currentIds[0] || '');

                                  setEditProduct({
                                    ...editProduct,
                                    categoryId: nextPrimaryId,
                                    categoryIds: currentIds
                                  });
                                }}
                                className="w-4 h-4 text-[#E91E63] border-pink-200 rounded focus:ring-[#E91E63]/30 cursor-pointer accent-[#E91E63]"
                              />
                              <span className="truncate">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AdminSelect
                        label="Brand"
                        value={editProduct.brandId || ''}
                        onChange={(e) => setEditProduct({ ...editProduct, brandId: e.target.value })}
                      >
                        <option value="">— No Brand / General —</option>
                        {state.brands.map((b, idx) => (
                          <option key={`brand-opt-${b.id || idx}`} value={b.id}>{b.name}</option>
                        ))}
                      </AdminSelect>

                      <AdminSelect
                        label="Catalog Status"
                        value={editProduct.status || ProductStatus.ACTIVE}
                        onChange={(e) => setEditProduct({ ...editProduct, status: e.target.value as ProductStatus })}
                      >
                        <option value={ProductStatus.ACTIVE}>Published (Active Storefront)</option>
                        <option value={ProductStatus.DRAFT}>Draft (Secret / Unpublished)</option>
                      </AdminSelect>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
                          Delivery Availability Groups
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-pink-100 p-3 rounded-xl max-h-48 overflow-y-auto shadow-inner">
                          {state.deliveryGroups?.map(g => {
                            const currentIds = editProduct.deliveryGroupIds || (editProduct.deliveryGroupId ? [editProduct.deliveryGroupId] : []);
                            const isChecked = currentIds.includes(g.id);
                            return (
                              <label key={g.id} className="flex items-start gap-2.5 p-2.5 bg-pink-50/30 rounded-xl border border-pink-100 cursor-pointer hover:border-[#E91E63]/30 transition select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let nextIds = [...currentIds];
                                    if (e.target.checked) {
                                      if (!nextIds.includes(g.id)) {
                                        nextIds.push(g.id);
                                      }
                                    } else {
                                      nextIds = nextIds.filter(id => id !== g.id);
                                    }
                                    setEditProduct({
                                      ...editProduct,
                                      deliveryGroupIds: nextIds,
                                      deliveryGroupId: nextIds[0] || undefined
                                    });
                                  }}
                                  className="w-4 h-4 text-indigo-650 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer mt-0.5"
                                />
                                <div className="text-left">
                                  <span className="text-[11px] font-bold text-slate-700 block leading-tight">{g.name}</span>
                                  <span className="text-[9px] text-indigo-600 font-mono block leading-none mt-0.5">{g.estimatedDeliveryTime || 'Standard'}</span>
                                  <span className="text-[8px] text-slate-400 block font-normal leading-normal truncate max-w-[170px]" title={g.coverageArea}>{g.coverageArea || 'No limit'}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          A product can available in 1 or more delivery groups. All selected options will output on the product details view for customers.
                        </p>
                      </div>
                    </div>
                </div>
                </AdminSection>

                <AdminSection title="Content & Media" subtitle="Descriptions, notes and product images" className="md:col-span-2">
                <div className="space-y-4">

                  <AdminTextarea
                    label="Product Description"
                    rows={3}
                    value={editProduct.description || ''}
                    onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                  />

                  <AdminTextarea
                    label="Long Description (SEO)"
                    hint="Comprehensive details for search visibility"
                    rows={5}
                    value={editProduct.longDescription || ''}
                    onChange={(e) => setEditProduct({ ...editProduct, longDescription: e.target.value })}
                    placeholder="Write comprehensive product details, floristry notes, ingredient highlights..."
                  />

                  <AdminTextarea
                    label="Additional Note (Customer Product Page)"
                    rows={2}
                    value={editProduct.additionalNote || ''}
                    onChange={(e) => setEditProduct({ ...editProduct, additionalNote: e.target.value })}
                    placeholder="e.g. Please order 24 hours in advance for custom design elements."
                  />

                  {/* Advanced Gifting Media Suite with File Upload and Size Guides */}
                  <div className="space-y-3.5 border-t border-pink-100/60 pt-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-800">Visual Digital Media Assets</span>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-500 font-semibold uppercase">
                        Size Guide: 600 x 600 px (Square)
                      </span>
                    </div>

                    {/* Drag & Browse file mock uploader converting to Base64 */}
                    <div className="border border-dashed border-pink-200 rounded-2xl p-5 bg-pink-50/30 text-center hover:bg-pink-50/50 hover:border-[#E91E63]/40 transition relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="prod-media-asset-file-uploader"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64Url = event.target?.result as string;
                              if (base64Url) {
                                const currentImgs = editProduct.images || [];
                                setEditProduct({
                                  ...editProduct,
                                  images: [...currentImgs, base64Url]
                                });
                                alert('Success: Image read on-the-fly and loaded into catalog preview state!');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="space-y-1">
                        <Upload className="w-5 h-5 mx-auto text-slate-400" />
                        <p className="text-xs font-semibold text-slate-700">Drag & Drop or browse local device files</p>
                        <p className="text-[9.5px] text-slate-450">Formats: JPG, WebP, PNG, SVG (Max 3MB). Square aspect ratio best.</p>
                      </div>
                    </div>

                    {/* Text URL direct input */}
                    <div>
                      <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1 font-mono">Current Active Image URL(s) - Comma Divided</label>
                      <input
                        type="text"
                        value={editProduct.images?.join(', ') || ''}
                        onChange={(e) => setEditProduct({
                          ...editProduct,
                          images: e.target.value
                            .split(/[,\n|;]/)
                            .map(s => s.replace(/&amp;/g, '&').trim())
                            .filter(Boolean)
                        })}
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-mono"
                        placeholder="Or input direct Unsplash URL links..."
                      />
                    </div>

                    {/* Previews and actions list */}
                    {editProduct.images && editProduct.images.length > 0 && (
                      <div className="space-y-2 text-left">
                        <span className="text-[9.5px] font-mono uppercase font-bold text-slate-450 block">Active Media Assets ({editProduct.images.length}) - Order Sequence</span>
                        <div className="space-y-2 text-xs">
                          {editProduct.images.map((img, i) => (
                            <div key={i} className="p-2 border border-slate-150 rounded-xl flex items-center justify-between gap-3 bg-white hover:border-rose-200 transition">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="relative shrink-0">
                                  <img src={img.trim()} className="w-12 h-12 rounded-lg object-cover border shadow-xs" alt="" />
                                  <span className="absolute -top-1.5 -left-1.5 bg-slate-900 border border-white text-white font-mono text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                                    {i + 1}
                                  </span>
                                </div>
                                <div className="overflow-hidden space-y-0.5">
                                  <span className="font-mono text-[9px] text-slate-450 truncate block max-w-[120px] sm:max-w-xs">
                                    {img.startsWith('data:') ? 'Base64 Native Media' : img}
                                  </span>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-605">
                                      {i === 0 ? '🏆 Primary/First Image' : `Image Position ${i + 1}`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Position Selector drop-down */}
                                <AdminSelect
                                  value={String(i)}
                                  onChange={(e) => {
                                    const targetIdx = parseInt(e.target.value);
                                    if (targetIdx !== i) {
                                      const nextImgs = [...(editProduct.images || [])];
                                      const [removed] = nextImgs.splice(i, 1);
                                      nextImgs.splice(targetIdx, 0, removed);
                                      setEditProduct({ ...editProduct, images: nextImgs });
                                    }
                                  }}
                                  selectClassName="!py-1 !pl-2 !pr-7 !text-[10px] !rounded-lg"
                                  className="!inline-block w-auto min-w-[120px]"
                                >
                                  {editProduct.images.map((_, posIdx) => (
                                    <option key={posIdx} value={posIdx}>
                                      Set as {posIdx === 0 ? '1st (Primary)' : `${posIdx + 1}${posIdx === 1 ? 'nd' : posIdx === 2 ? 'rd' : 'th'}`}
                                    </option>
                                  ))}
                                </AdminSelect>

                                {/* Up-Down arrows */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={i === 0}
                                    onClick={() => {
                                      const nextImgs = [...(editProduct.images || [])];
                                      const temp = nextImgs[i - 1];
                                      nextImgs[i - 1] = nextImgs[i];
                                      nextImgs[i] = temp;
                                      setEditProduct({ ...editProduct, images: nextImgs });
                                    }}
                                    className={`p-1 bg-slate-50 border rounded-md border-slate-200 text-slate-600 transition ${i === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                                    title="Move Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={i === editProduct.images.length - 1}
                                    onClick={() => {
                                      const nextImgs = [...(editProduct.images || [])];
                                      const temp = nextImgs[i + 1];
                                      nextImgs[i + 1] = nextImgs[i];
                                      nextImgs[i] = temp;
                                      setEditProduct({ ...editProduct, images: nextImgs });
                                    }}
                                    className={`p-1 bg-slate-50 border rounded-md border-slate-200 text-slate-600 transition ${i === editProduct.images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                                    title="Move Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Deduct button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextImgs = (editProduct.images || []).filter((_, idx) => idx !== i);
                                    setEditProduct({ ...editProduct, images: nextImgs });
                                  }}
                                  className="p-1 px-2 border border-rose-105 bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold rounded-lg text-[10px] uppercase tracking-wider transition ml-1"
                                >
                                  Deduct
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fast Gifting Prototyping Assets Presets */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block text-left">Nepalese Gifting Preset Media Library</span>
                      <div className="flex gap-1.5 overflow-x-auto py-1">
                        {[
                          { title: 'Rose Bouquet', url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop' },
                          { title: 'Fudge Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600&auto=format&fit=crop' },
                          { title: 'Choc Hamper', url: 'https://images.unsplash.com/photo-1549463010-14ec3c97ab7d?q=80&w=600&auto=format&fit=crop' },
                          { title: 'Fruit Basket', url: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=600&auto=format&fit=crop' }
                        ].map((preset) => (
                          <button
                            key={preset.title}
                            type="button"
                            onClick={() => {
                              const currentImgs = editProduct.images || [];
                              setEditProduct({
                                ...editProduct,
                                images: [...currentImgs, preset.url]
                              });
                            }}
                            className="bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded px-2 py-1 text-[9px] font-semibold whitespace-nowrap cursor-pointer transition shrink-0"
                          >
                            + {preset.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                </AdminSection>

                {/* SEO Metas + GIFT HAMPER SYSTEM (NESTED SUB-ENTITIES COMPOSITION) */}
                <AdminSection title="Options & Hamper Builder" subtitle="Personalization, variants and gift hamper composition" className="md:col-span-2">
                <div className="space-y-5">
                  {/* Personalization Fields Setting */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3.5 text-left">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">Required Personalization Fields</h5>
                      <p className="text-[10px] text-slate-500">Pick which custom information this particular product will gather from customers.</p>
                    </div>

                    <div className="space-y-2.5 pt-2.5 border-t border-slate-200">
                      <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editProduct.allowCakeMessage}
                          onChange={(e) => setEditProduct({ ...editProduct, allowCakeMessage: e.target.checked })}
                          className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                        <span>Collect custom cake message (icing inscription)</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editProduct.allowGiftMessage}
                          onChange={(e) => setEditProduct({ ...editProduct, allowGiftMessage: e.target.checked })}
                          className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                        <span>Collect custom gift message / written card note</span>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editProduct.allowPhotoUpload}
                          onChange={(e) => setEditProduct({ ...editProduct, allowPhotoUpload: e.target.checked })}
                          className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                        />
                        <span>Collect uploaded image print for custom personalization</span>
                      </label>

                      <div className="pt-2 border-t border-slate-150">
                        <label className="flex items-start gap-2.5 text-xs font-semibold text-rose-700 cursor-pointer bg-amber-50/50 p-2.5 rounded-lg border border-amber-200">
                          <input
                            type="checkbox"
                            checked={!!editProduct.allowOrderWhenOutOfStock}
                            onChange={(e) => setEditProduct({ ...editProduct, allowOrderWhenOutOfStock: e.target.checked })}
                            className="mt-0.5 w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">Allow Ordering When Out of Stock</span>
                            <span className="text-[10px] text-slate-400 font-medium">If active, customers will see the product as available even if stock matches 0 (backorder override enabled).</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* CSV Catalog Specifications Extends (Barcode, Weight, Group, Variant, Size) */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3.5 text-left">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">Custom Registry Specifications</h5>
                      <p className="text-[10px] text-slate-500">Physical measurements, barcodes, groups, and variants parsed from catalog CSV uploads.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Barcode ID / UPC</label>
                        <input
                          type="text"
                          value={editProduct.barcode || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, barcode: e.target.value })}
                          placeholder="e.g. 2263"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Weight (KG / Lbs / Units)</label>
                        <input
                          type="text"
                          value={editProduct.weight !== undefined ? editProduct.weight : ''}
                          onChange={(e) => setEditProduct({ ...editProduct, weight: e.target.value })}
                          placeholder="e.g. 0.5 or 1"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-mono text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product Group</label>
                        <input
                          type="text"
                          value={editProduct.group || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, group: e.target.value })}
                          placeholder="e.g. Apparel"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Aesthetic SKU Variant</label>
                        <input
                          type="text"
                          value={editProduct.variant || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, variant: e.target.value })}
                          placeholder="e.g. Kurtha Set"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Standard Item Size</label>
                        <input
                          type="text"
                          value={editProduct.size || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, size: e.target.value })}
                          placeholder="e.g. M / L / XL"
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Variations Manager (Variables set from Admin user) */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-4 text-left">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-800">Product Variables & Dropdown Options</h5>
                      <p className="text-[10px] text-slate-500">
                        Create custom selector dropdowns (e.g., Size, Flavor, Color) with optional price adjustments.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2.5 border-t border-slate-200">
                      {/* List of current variations */}
                      {((editProduct.variations || []) as any[]).map((variation: any, varIdx: number) => (
                        <div key={variation.id || varIdx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                            <span className="font-bold text-xs text-rose-700 uppercase tracking-wide">
                              📂 {variation.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const list = (editProduct.variations || []).filter((_, i) => i !== varIdx);
                                setEditProduct({ ...editProduct, variations: list });
                              }}
                              className="text-[10px] text-rose-600 hover:underline font-bold"
                            >
                              Delete Category
                            </button>
                          </div>

                          {/* List options inside this variation */}
                          <div className="space-y-1.5">
                            {!variation.options || variation.options.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">No options added yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 gap-1.5 align-middle">
                                {variation.options.map((opt: any, optIdx: number) => (
                                  <div key={optIdx} className="flex justify-between items-center text-[11px] bg-slate-50 p-1.5 px-2 rounded border border-slate-100">
                                    <span className="font-semibold text-slate-700">{opt.value}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-bold text-amber-600">
                                        {opt.priceAdjustment >= 0 ? `+ Rs. ${opt.priceAdjustment}` : `- Rs. ${Math.abs(opt.priceAdjustment)}`}
                                      </span>
                                      <span className="font-mono text-[9px] bg-slate-200/60 text-slate-600 px-1 py-0.5 rounded">
                                        Stock: {opt.stock !== undefined ? opt.stock : '∞'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const countStr = prompt(`Set inventory items in stock for variant option "${opt.value}":\n(Leave empty or write -1 to set as Unlimited)`, opt.stock !== undefined ? String(opt.stock) : '');
                                          if (countStr === null) return;
                                          const parsed = parseInt(countStr);
                                          const newStock = isNaN(parsed) || parsed < 0 ? undefined : parsed;
                                          const updated = (editProduct.variations || []).map((v, i) => {
                                            if (i === varIdx) {
                                              const updatedOpts = [...v.options];
                                              updatedOpts[optIdx] = { ...updatedOpts[optIdx], stock: newStock };
                                              return { ...v, options: updatedOpts };
                                            }
                                            return v;
                                          });
                                          setEditProduct({ ...editProduct, variations: updated });
                                        }}
                                        className="text-[9.5px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                        title="Change stock limit"
                                      >
                                        Set Stock
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = (editProduct.variations || []).map((v, i) => {
                                            if (i === varIdx) {
                                              return {
                                                ...v,
                                                options: v.options.filter((_, oi) => oi !== optIdx)
                                              };
                                            }
                                            return v;
                                          });
                                          setEditProduct({ ...editProduct, variations: updated });
                                        }}
                                        className="text-slate-400 hover:text-rose-600 transition font-bold"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Inline Form to add an option to this variation */}
                          <div className="flex gap-1.5 pt-2">
                            <input
                              type="text"
                              id={`new-opt-val-${varIdx}`}
                              placeholder="Option e.g. 1 Lbs / Chocolate"
                              className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded text-[#0d0d0d] bg-white font-medium shadow-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const btn = document.getElementById(`add-opt-btn-${varIdx}`);
                                  btn?.click();
                                }
                              }}
                            />
                            <input
                              type="number"
                              id={`new-opt-adj-${varIdx}`}
                              placeholder="Plus Rs."
                              className="w-18 px-2 py-1 text-xs border border-slate-200 rounded text-[#0d0d5d] bg-white text-center font-mono font-bold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const btn = document.getElementById(`add-opt-btn-${varIdx}`);
                                  btn?.click();
                                }
                              }}
                            />
                            <button
                              type="button"
                              id={`add-opt-btn-${varIdx}`}
                              onClick={() => {
                                const valInput = document.getElementById(`new-opt-val-${varIdx}`) as HTMLInputElement;
                                const adjInput = document.getElementById(`new-opt-adj-${varIdx}`) as HTMLInputElement;
                                const value = valInput?.value.trim();
                                const adjustment = parseFloat(adjInput?.value || '0') || 0; const stockInput = document.getElementById(`new-opt-stock-${varIdx}`) as HTMLInputElement; const stockVal = (stockInput && stockInput.value.trim() !== '') ? parseInt(stockInput.value) : undefined;

                                if (!value) {
                                  alert('Option value is required');
                                  return;
                                }

                                const updated = (editProduct.variations || []).map((v, i) => {
                                  if (i === varIdx) {
                                    return {
                                      ...v,
                                      options: [...(v.options || []), { value, priceAdjustment: adjustment, stock: stockVal }]
                                    };
                                  }
                                  return v;
                                });

                                setEditProduct({ ...editProduct, variations: updated });
                                if (valInput) valInput.value = '';
                                if (adjInput) adjInput.value = ''; if (stockInput) stockInput.value = '';
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold px-2 py-1 border border-transparent rounded transition whitespace-nowrap cursor-pointer"
                            >
                              + Option
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Inline Form to add a new category */}
                      <div className="p-3 bg-[#fffbeb] border border-amber-200 rounded-lg space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-amber-800">
                          Create New Option Category
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="new-var-name-input"
                            placeholder="e.g. Size, Flavor, Color, Style"
                            className="flex-1 px-2.5 py-1.5 text-xs border border-slate-350 bg-white rounded-lg text-slate-800 font-semibold"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.getElementById('add-var-category-btn')?.click();
                              }
                            }}
                          />
                          <button
                            type="button"
                            id="add-var-category-btn"
                            onClick={() => {
                              const input = document.getElementById('new-var-name-input') as HTMLInputElement;
                              const name = input?.value.trim();
                              if (!name) {
                                alert('Please specify a variation category name.');
                                  return;
                                }

                                const exists = (editProduct.variations || []).some(v => v.name.toLowerCase() === name.toLowerCase());
                                if (exists) {
                                  alert('This category name already exists.');
                                  return;
                                }

                                const list = [...(editProduct.variations || []), {
                                  id: `var-${Date.now()}`,
                                  name,
                                  options: []
                                }];

                                setEditProduct({ ...editProduct, variations: list });
                                if (input) input.value = '';
                              }}
                              className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg transition cursor-pointer"
                            >
                              + Add Category
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Gift Hamper Toggle */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-800">Is this a Gift Hamper (Combo)?</h5>
                        <p className="text-[10px] text-slate-500">Construct composite gift packs with other standalone products in your registry.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={editProduct.isHamper || false}
                        onChange={(e) => {
                          setEditProduct({ ...editProduct, isHamper: e.target.checked, hamperItems: [] });
                        }}
                        className="w-4 h-4 text-rose-600 border-slate-300 focus:ring-rose-500 rounded cursor-pointer"
                      />
                    </div>

                    {editProduct.isHamper && (
                      <div className="space-y-3.5 border-t border-slate-200 pt-3.5 text-left">
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-150">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Combo Composition</span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = editProduct.hamperItems || [];
                              if (items.length === 0) {
                                alert('Add at least one individual component item first to compile descriptions.');
                                return;
                              }
                              const descFragments = items.map((item, idx) => {
                                const p = state.products.find(prod => prod.id === item.productId);
                                return p ? `🎁 [Qty: ${item.quantity}] ${p.name}: ${p.description || 'Exclusive premium addition'}` : '';
                              }).filter(Boolean);
                              
                              const finalComp = `This luxury Gift Combo is hand-packed with:\n${descFragments.join('\n')}\n\nExquisitely decorated in a Koseli premium basket wrap. Order before 3 PM for guaranteed prompt service across dynamic Nepal.`;
                              
                              setEditProduct({ ...editProduct, description: finalComp });
                              alert('Success! Content indexes and individual descriptions auto-compiled and injected.');
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[9.5px] font-bold font-mono px-2 py-1 rounded transition uppercase cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-white" />
                            Auto description
                          </button>
                        </div>
                                       <div className="space-y-2">
                          {(editProduct.hamperItems || []).map((item, itemIdx) => {
                            const subProd = state.products.find(p => p.id === item.productId);
                            return (
                              <div key={itemIdx} className="bg-white p-3 rounded-xl border border-slate-250 hover:border-slate-300 transition shadow-xs flex flex-col gap-2">
                                <div className="flex gap-2 items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                                    {subProd ? subProd.name : 'Unknown Product'} ({subProd ? `Rs.${subProd.price}` : 'N/A'})
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      min="1"
                                      onChange={(e) => {
                                        const items = [...(editProduct.hamperItems || [])];
                                        items[itemIdx].quantity = parseInt(e.target.value) || 1;
                                        setEditProduct({ ...editProduct, hamperItems: items });
                                      }}
                                      className="w-12 px-1 py-0.5 border text-xs font-mono font-bold text-center rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const items = (editProduct.hamperItems || []).filter((_, idx) => idx !== itemIdx);
                                        setEditProduct({ ...editProduct, hamperItems: items });
                                      }}
                                      className="text-xs text-rose-600 hover:underline font-semibold"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                {/* Custom variation preset setting inside combo */}
                                {subProd && subProd.variations && subProd.variations.length > 0 && (
                                  <div className="mt-1 p-2 bg-slate-50 border border-slate-150 rounded-lg space-y-1.5 text-left">
                                    <span className="text-[9px] uppercase font-mono font-bold text-slate-500 block">
                                      🔧 Sub-component Variation Rule:
                                    </span>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {subProd.variations.map((v) => {
                                        const storedOpt = (item.selectedVariations || []).find(sv => sv.name === v.name)?.value || '';
                                        return (
                                          <div key={v.id || v.name} className="flex items-center justify-between gap-2 text-[10px]">
                                            <span className="font-semibold text-slate-600 font-mono text-[9px]">{v.name}:</span>
                                            <select
                                              value={storedOpt}
                                              onChange={(e) => {
                                                const newVal = e.target.value;
                                                const otherVars = (item.selectedVariations || []).filter(sv => sv.name !== v.name);
                                                const updatedVars = newVal 
                                                  ? [...otherVars, { name: v.name, value: newVal }] 
                                                  : otherVars;
                                                const items = [...(editProduct.hamperItems || [])];
                                                items[itemIdx] = {
                                                  ...item,
                                                  selectedVariations: updatedVars.length > 0 ? updatedVars : undefined
                                                };
                                                setEditProduct({ ...editProduct, hamperItems: items });
                                              }}
                                              className="p-1 px-1.5 bg-white border border-slate-200 rounded font-mono text-[9.5px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
                                            >
                                              <option value="">Let Customer Choose (Interactive)</option>
                                              {v.options.map((opt, optIdx) => (
                                                <option key={`subprod-opt-${opt.value || optIdx}`} value={opt.value}>Preset: {opt.value}</option>
                                              ))}
                                            </select>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-150 shadow-xs">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">
                              🔍 Search Gifting item to add (by Name or SKU)
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Type keywords or SKU number..."
                                value={hamperSearchQuery}
                                onChange={(e) => setHamperSearchQuery(e.target.value)}
                                className="w-full p-2 pl-8 border border-slate-205 rounded-lg text-xs"
                              />
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                            </div>

                            {/* Floating matching search items block */}
                            {hamperSearchQuery.trim().length > 0 && (
                              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-md">
                                {state.products
                                  .filter(p => {
                                    if (p.isHamper || p.status === 'deleted' || p.id === editProduct.id) return false;
                                    const sStr = hamperSearchQuery.toLowerCase();
                                    return (
                                      p.name.toLowerCase().includes(sStr) ||
                                      (p.sku && p.sku.toLowerCase().includes(sStr))
                                    );
                                  })
                                  .length === 0 ? (
                                    <div className="p-2.5 text-slate-400 text-xs italic text-center">No products matched query.</div>
                                  ) : (
                                    state.products
                                      .filter(p => {
                                        if (p.isHamper || p.status === 'deleted' || p.id === editProduct.id) return false;
                                        const sStr = hamperSearchQuery.toLowerCase();
                                        return (
                                          p.name.toLowerCase().includes(sStr) ||
                                          (p.sku && p.sku.toLowerCase().includes(sStr))
                                        );
                                      })
                                      .slice(0, 10)
                                      .map(p => {
                                        const isAlreadyIn = (editProduct.hamperItems || []).some(item => item.productId === p.id);
                                        return (
                                          <div key={p.id} className="p-2 flex justify-between items-center text-xs hover:bg-slate-50 transition">
                                            <div className="truncate pr-2">
                                              <span className="font-bold text-rose-600 font-mono text-[9.5px] block">{p.sku || 'STANDALONE-ITEM'}</span>
                                              <span className="font-medium text-slate-800">{p.name}</span>
                                              <span className="text-[10px] text-slate-450 block">Rs. {p.price.toLocaleString()} | Qty: {p.stock}</span>
                                            </div>
                                            <button
                                              type="button"
                                              disabled={isAlreadyIn}
                                              onClick={() => {
                                                const items = [...(editProduct.hamperItems || []), { productId: p.id, quantity: 1 }];
                                                setEditProduct({ ...editProduct, hamperItems: items });
                                                setHamperSearchQuery('');
                                              }}
                                              className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                                                isAlreadyIn
                                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                                              }`}
                                            >
                                              {isAlreadyIn ? 'Added' : '+ Add item'}
                                            </button>
                                          </div>
                                        );
                                      })
                                  )}
                              </div>
                            )}
                          </div>

                          {/* Fallback add component select dropdown */}
                          <div className="space-y-1 pt-1 border-t border-slate-100">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                              OR Select Standalone Product from Dropdown:
                            </label>
                            <select
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                if ((editProduct.hamperItems || []).some(item => item.productId === val)) {
                                  alert('This product is already a subcategory item.');
                                  return;
                                }
                                const items = [...(editProduct.hamperItems || []), { productId: val, quantity: 1 }];
                                setEditProduct({ ...editProduct, hamperItems: items });
                                e.target.value = '';
                              }}
                              className="w-full p-2 border text-xs text-slate-700 rounded-lg bg-slate-50 cursor-pointer"
                            >
                              <option value="">+ Select standalone option...</option>
                              {state.products.filter(p => !p.isHamper && p.status !== 'deleted' && p.id !== editProduct.id).map((p, idx) => (
                                <option key={`subprod-select-${p.id || idx}`} value={p.id}>{p.name} ({p.sku ? p.sku + ' - ' : ''}Rs.{p.price})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Cumulative cost visual assistance */}
                        <div className="text-right text-[11px] font-mono font-bold text-slate-500">
                          Raw sum of components price: {' '}
                          <span className="text-rose-600 underline">
                            Rs. {(editProduct.hamperItems || []).reduce((sum, item) => {
                              const p = state.products.find(prod => prod.id === item.productId);
                              return sum + (p ? p.price * item.quantity : 0);
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SEO perspective form */}
                  <div className="p-4 bg-rose-50/50 border border-pink-100 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="text-sm font-semibold text-rose-800 flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-rose-500" /> SEO Optimization Panel
                        </h5>
                        <p className="text-[10px] text-slate-500">Meta tags tailored specifically for Google and social sharing grids.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateSEO('product', editProduct.name || '', editProduct.description || '', (title, desc, keys) => {
                          setEditProduct(prev => ({
                            ...prev,
                            metaTitle: title,
                            metaDescription: desc,
                            metaKeywords: keys
                          }));
                        })}
                        disabled={aiGenerating}
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:bg-slate-350 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        {aiGenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Fitting SEO...
                          </>
                        ) : (
                          <>
                            🪄 AI SEO Generate
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Meta Search Title</label>
                        <input
                          type="text"
                          value={editProduct.metaTitle || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, metaTitle: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono"
                          maxLength={65}
                          placeholder="Suggested under 60 characters with keyword trigger"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Meta Description Tag</label>
                        <textarea
                          rows={2}
                          value={editProduct.metaDescription || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, metaDescription: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono"
                          maxLength={160}
                          placeholder="Compelling promotional copy with brand statement under 155 words"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Meta Keywords list</label>
                        <input
                          type="text"
                          value={editProduct.metaKeywords || ''}
                          onChange={(e) => setEditProduct({ ...editProduct, metaKeywords: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-mono"
                          placeholder="anniversary bouquet, birthday hamper, roses basket, delivery nepal"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Interactive SEO Auditor */}
                  {editProduct && (
                    <div className="mt-4">
                      <SEOAssistantWidget
                        type="product"
                        item={editProduct}
                        onChangeFields={(updates) => setEditProduct({ ...editProduct, ...updates })}
                        state={state}
                      />
                    </div>
                  )}
                </div>
                </AdminSection>
              </div>

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-pink-100/60">
                <AdminGhostButton onClick={() => setEditProduct(null)}>
                  Cancel
                </AdminGhostButton>
                <AdminPrimaryButton
                  onClick={() => {
                    if (!editProduct.name || !editProduct.sku) {
                      alert('Product template requires Name and SKU specifications.');
                      return;
                    }
                    const categoryIds = Array.from(new Set([
                      ...(editProduct.categoryIds || []),
                      ...(editProduct.categoryId ? [editProduct.categoryId] : [])
                    ].filter(Boolean)));
                    const normalizedProduct = {
                      ...editProduct,
                      categoryId: editProduct.categoryId || categoryIds[0] || '',
                      categoryIds
                    } as Product;
                    const list = [...state.products];
                    const idx = list.findIndex(prod => prod.id === normalizedProduct.id);
                    if (idx >= 0) {
                      list[idx] = normalizedProduct;
                    } else {
                      list.push(normalizedProduct);
                    }
                    onUpdateState({ ...state, products: list });
                    setEditProduct(null);
                  }}
                >
                  Save to Catalog
                </AdminPrimaryButton>
              </div>
            </div>
          )}
        </>
      )}

      {/* CATEGORIES MANAGEMENT SECTION */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-semibold text-slate-800 text-sm tracking-wider uppercase">Active Store Categories</h4>
              <button
                type="button"
                onClick={() => setEditCategory({})}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                id="btn-create-category-top"
              >
                + Create New Category
              </button>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <tr>
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {state.categories.map(c => (
                    <tr key={c.id}>
                      <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                        <img src={c.image} className="w-8 h-8 rounded object-cover" alt="" />
                        {c.name}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500">{c.slug}</td>
                      <td className="p-3 text-xs text-slate-400 truncate max-w-[200px]">{c.description}</td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditCategory(c)}
                          className="px-2.5 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-bold transition"
                          id={`btn-edit-cat-${c.id}`}
                        >
                          Modify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you absolutely sure you want to delete the category "${c.name}"? This will not delete the products inside it, but they will be unassigned or reset from this category.`)) {
                              const updatedCategories = state.categories.filter(cat => cat.id !== c.id);
                              
                              // Clean up any product parent category references
                              const updatedProducts = state.products.map(p => {
                                let updatedP = { ...p };
                                if (p.categoryId === c.id) {
                                  updatedP.categoryId = updatedCategories[0]?.id || '';
                                }
                                if (p.categoryIds && p.categoryIds.includes(c.id)) {
                                  updatedP.categoryIds = p.categoryIds.filter(id => id !== c.id);
                                }
                                return updatedP;
                              });

                              // Clean up category parenting references
                              const cleanedCategories = updatedCategories.map(cat => {
                                if (cat.parentCategoryId === c.id) {
                                  const { parentCategoryId, ...rest } = cat;
                                  return rest;
                                }
                                return cat;
                              });

                              onUpdateState({
                                ...state,
                                categories: cleanedCategories,
                                products: updatedProducts
                              });
                              
                              if (editCategory?.id === c.id) {
                                setEditCategory(null);
                              }
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] text-rose-600 bg-rose-50 hover:bg-rose-100 rounded font-bold transition"
                          id={`btn-delete-cat-${c.id}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* HIERARCHY / PLACEMENT BUILDER */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
              <div>
                <h4 className="font-extrabold text-xs text-rose-800 tracking-wider uppercase">Interactive Menu Hierarchy & Placement Builder</h4>
                <p className="text-[11px] text-slate-500">Manage category positions inside the storefront menu. Drag-and-drop to swap/resort items visually, toggle visibility, or assign a category to multiple paths without requiring database updates.</p>
              </div>

              {/* Selector for current Menu Group to edit */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                <span className="font-bold">Select Active Menu context:</span>
                <select
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  className="p-1 px-2.5 font-bold border rounded bg-slate-50 text-slate-800 cursor-pointer"
                >
                  <option value="main">Main Header Navigation Menu</option>
                  {state.categories.map((cat, idx) => (
                    <option key={`menu-cat-submenu-${cat.id || idx}`} value={cat.id}>↳ Submenu under "{cat.name}"</option>
                  ))}
                </select>

                <div className="flex-1" />

                {/* Add new category placement directly here */}
                <div className="flex gap-1.5 items-center">
                  <select
                    value={categoryToAddToMenu}
                    onChange={(e) => setCategoryToAddToMenu(e.target.value)}
                    className="p-1 text-xs border rounded bg-slate-50 cursor-pointer font-semibold text-slate-700"
                  >
                    <option value="">-- Choose Category --</option>
                    {state.categories.map((c, idx) => (
                      <option key={`choose-cat-${c.id || idx}`} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!categoryToAddToMenu) return;
                      const cat = state.categories.find(c => c.id === categoryToAddToMenu);
                      if (!cat) return;
                      // Ensure menuPlacements array exists
                      const currentPlacements = cat.menuPlacements ? [...cat.menuPlacements] : [];
                      
                      // Check if already placed in this menu
                      if (currentPlacements.some(p => p.parentMenuId === selectedMenuId)) {
                        alert(`Category is already assigned to this menu.`);
                        return;
                      }

                      const updatedCategories = state.categories.map(c => {
                        if (c.id === categoryToAddToMenu) {
                          // Compile placements
                          const plc = c.menuPlacements ? [...c.menuPlacements] : [];
                          // If empty, sync legacy single setup before appending
                          if (plc.length === 0 && c.showInNavbar !== false) {
                            plc.push({
                              id: `legacy-${c.id}-main`,
                              parentMenuId: c.parentCategoryId || 'main',
                              sequence: c.navbarSeq || 1,
                              enabled: true
                            });
                          }
                          plc.push({
                            id: `placement-${Date.now()}`,
                            parentMenuId: selectedMenuId,
                            sequence: plc.length + 1,
                            enabled: true
                          });
                          return { ...c, menuPlacements: plc };
                        }
                        return c;
                      });

                      onUpdateState({ ...state, categories: updatedCategories });
                      setCategoryToAddToMenu('');
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white p-1 px-3 rounded font-bold transition cursor-pointer text-xs"
                  >
                    + Assign to Menu
                  </button>
                </div>
              </div>

              {/* Draggable Category Nodes list */}
              {(() => {
                // Compile all placements in this selected menu
                const placedItems: { category: any; placement: any }[] = [];
                state.categories.forEach(c => {
                  const placements = c.menuPlacements && c.menuPlacements.length > 0
                    ? c.menuPlacements
                    : c.showInNavbar !== false
                    ? [{ id: `legacy-${c.id}-main`, parentMenuId: c.parentCategoryId || 'main', sequence: c.navbarSeq || 1, enabled: true }]
                    : [];

                  placements.forEach(p => {
                    if (p.parentMenuId === selectedMenuId) {
                      placedItems.push({ category: c, placement: p });
                    }
                  });
                });

                placedItems.sort((a, b) => (a.placement.sequence || 1) - (b.placement.sequence || 1));

                if (placedItems.length === 0) {
                  return (
                    <div className="py-8 bg-white border border-slate-200 border-dashed rounded-xl text-center text-xs text-slate-400 italic">
                      No categories assigned to this menu yet. Use the dropdown above to add placements.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {placedItems.map((item, idx) => {
                      return (
                        <div
                          key={`${item.category.id}-${item.placement.id}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', idx.toString());
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const fromIndexStr = e.dataTransfer.getData('text/plain');
                            if (!fromIndexStr) return;
                            const fromIndex = parseInt(fromIndexStr);
                            const toIndex = idx;
                            if (fromIndex === toIndex) return;

                            // Reorder sequence values
                            const updatedItems = [...placedItems];
                            const temp = updatedItems[fromIndex];
                            updatedItems.splice(fromIndex, 1);
                            updatedItems.splice(toIndex, 0, temp);

                            // Apply new sequence integers 1,2,3...
                            const updatedCategories = state.categories.map(c => {
                              // If this category is part of the updated list
                              const matchIndex = updatedItems.findIndex(u => u.category.id === c.id);
                              if (matchIndex >= 0) {
                                // Update sequence inside placements
                                const plc = c.menuPlacements ? [...c.menuPlacements] : [];
                                if (plc.length === 0 && c.showInNavbar !== false) {
                                  plc.push({
                                    id: `legacy-${c.id}-main`,
                                    parentMenuId: c.parentCategoryId || 'main',
                                    sequence: c.navbarSeq || 1,
                                    enabled: true
                                  });
                                }
                                const currentPlcIdx = plc.findIndex(p => p.parentMenuId === selectedMenuId);
                                if (currentPlcIdx >= 0) {
                                  plc[currentPlcIdx].sequence = matchIndex + 1;
                                }
                                return { ...c, menuPlacements: plc };
                              }
                              return c;
                            });

                            onUpdateState({ ...state, categories: updatedCategories });
                          }}
                          className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex flex-col text-slate-350 select-none items-center justify-center font-mono text-[8px] font-bold">
                            <span>⇅</span>
                            <span>DRAG</span>
                          </div>

                          <img src={item.category.image} className="w-8 h-8 rounded object-cover" alt="" />
                          
                          <div className="flex-1 text-left">
                            <span className="text-xs font-bold text-slate-800 block leading-tight">{item.category.name}</span>
                            <span className="text-[9px] font-mono text-slate-400">Position sequence: #{item.placement.sequence} | slug: /{item.category.slug}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            {/* Visibility active switch toggle */}
                            <label className="flex items-center gap-1 cursor-pointer">
                              <span className="text-[9px] text-slate-400 uppercase">Visible:</span>
                              <input
                                type="checkbox"
                                checked={item.placement.enabled}
                                onChange={(e) => {
                                  const updatedCategories = state.categories.map(c => {
                                    if (c.id === item.category.id) {
                                      const plc = c.menuPlacements ? [...c.menuPlacements] : [];
                                      if (plc.length === 0 && c.showInNavbar !== false) {
                                        plc.push({
                                          id: `legacy-${c.id}-main`,
                                          parentMenuId: c.parentCategoryId || 'main',
                                          sequence: c.navbarSeq || 1,
                                          enabled: true
                                        });
                                      }
                                      const currentPlcIdx = plc.findIndex(p => p.parentMenuId === selectedMenuId);
                                      if (currentPlcIdx >= 0) {
                                        plc[currentPlcIdx].enabled = e.target.checked;
                                      }
                                      return { ...c, menuPlacements: plc };
                                    }
                                    return c;
                                  });
                                  onUpdateState({ ...state, categories: updatedCategories });
                                }}
                                className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer"
                              />
                            </label>

                            {/* Delete placement option */}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedCategories = state.categories.map(c => {
                                  if (c.id === item.category.id) {
                                    const plc = c.menuPlacements ? [...c.menuPlacements] : [];
                                    if (plc.length === 0 && c.showInNavbar !== false) {
                                      plc.push({
                                        id: `legacy-${c.id}-main`,
                                        parentMenuId: c.parentCategoryId || 'main',
                                        sequence: c.navbarSeq || 1,
                                        enabled: true
                                      });
                                    }
                                    const filteredPlc = plc.filter(p => p.parentMenuId !== selectedMenuId);
                                    return { ...c, menuPlacements: filteredPlc };
                                  }
                                  return c;
                                });
                                onUpdateState({ ...state, categories: updatedCategories });
                              }}
                              className="px-2 py-0.5 text-[9px] border border-red-100 hover:bg-red-50 text-rose-600 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ADD / EDIT CATEGORY FORM */}
          <div className="p-5 bg-white border border-slate-150 rounded-xl space-y-4 h-fit">
            <h4 className="font-semibold text-slate-800">{editCategory?.id ? 'Edit Category' : 'Create New Category'}</h4>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category Title</label>
                <input
                  type="text"
                  value={editCategory?.name || ''}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    setEditCategory(prev => ({ ...(prev || {}), name: e.target.value, slug }));
                  }}
                  className="w-full p-2 border bg-slate-50 rounded"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Visual Banner URL</label>
                <input
                  type="text"
                  value={editCategory?.image || ''}
                  onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), image: e.target.value }))}
                  className="w-full p-2 border bg-slate-50 rounded font-mono"
                  placeholder="Paste direct CDN image URL..."
                />
                <div className="mt-1.5 border border-dashed border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center hover:bg-slate-100/70 hover:border-rose-450 transition relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64Url = event.target?.result as string;
                          if (base64Url) {
                            setEditCategory(prev => ({ ...(prev || {}), image: base64Url }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-1.5 text-slate-500">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-semibold">Upload local visual banner</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Brief Description</label>
                <textarea
                  rows={2}
                  value={editCategory?.description || ''}
                  onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), description: e.target.value }))}
                  className="w-full p-2 border bg-slate-50 rounded"
                />
              </div>

              {/* Category Navbar Configuration */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-3 text-left">
                <span className="font-bold text-[10px] uppercase text-slate-500 block font-mono">Navbar Menu Settings (Legacy)</span>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showInNavbar"
                    checked={editCategory?.showInNavbar || false}
                    onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), showInNavbar: e.target.checked }))}
                    className="w-4 h-4 text-rose-600 border-slate-300 focus:ring-rose-500 rounded cursor-pointer"
                  />
                  <label htmlFor="showInNavbar" className="text-xs text-slate-705 font-semibold cursor-pointer">
                    Show in Navbar Menu Bar
                  </label>
                </div>

                {editCategory?.showInNavbar && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Navbar Order (Left to Right)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 1"
                        value={editCategory?.navbarSeq || 1}
                        onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), navbarSeq: parseInt(e.target.value) || 1 }))}
                        className="w-full p-1.5 bg-white border text-xs font-mono rounded text-center font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Sub-menu of Menu Group</label>
                      <select
                        value={editCategory?.parentCategoryId || ''}
                        onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), parentCategoryId: e.target.value || undefined }))}
                        className="w-full p-1.5 bg-white border text-xs rounded text-slate-700 font-semibold"
                      >
                        <option value="">-- Main level header --</option>
                        {state.categories
                          .filter(c => c.id !== editCategory?.id && !c.parentCategoryId)
                          .map((c, idx) => (
                            <option key={`cat-parent-${c.id || idx}`} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Placements Assignment lists */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[10px] uppercase text-indigo-805 block font-mono">Advanced Placements ({editCategory?.menuPlacements?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const list = editCategory?.menuPlacements ? [...editCategory.menuPlacements] : [];
                      list.push({
                        id: `placement-${Date.now()}`,
                        parentMenuId: 'main',
                        sequence: list.length + 1,
                        enabled: true
                      });
                      setEditCategory(prev => ({ ...(prev || {}), menuPlacements: list }));
                    }}
                    className="p-1 px-1.5 text-[8.5px] bg-indigo-50 hover:bg-indigo-100 text-[#E91E63] rounded font-bold transition"
                  >
                    + Add Placement
                  </button>
                </div>

                {editCategory?.menuPlacements && editCategory.menuPlacements.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                    {editCategory.menuPlacements.map((plc, pIdx) => (
                      <div key={plc.id} className="p-2 border rounded bg-white space-y-2 relative shadow-2xs">
                        <div className="flex justify-between items-center border-b pb-1 mb-1">
                          <span className="font-mono text-[8px] text-slate-400">Position #{plc.sequence}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const list = editCategory.menuPlacements?.filter(p => p.id !== plc.id) || [];
                              setEditCategory(prev => ({ ...(prev || {}), menuPlacements: list }));
                            }}
                            className="text-[8px] text-rose-600 hover:underline hover:font-bold"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Assign as Submenu under</span>
                            <select
                              value={plc.parentMenuId}
                              onChange={(e) => {
                                const list = [...(editCategory.menuPlacements || [])];
                                list[pIdx].parentMenuId = e.target.value;
                                setEditCategory(prev => ({ ...(prev || {}), menuPlacements: list }));
                              }}
                              className="w-full p-1 border text-[10px] rounded bg-slate-50 font-semibold"
                            >
                              <option value="main">Main Menu Bar</option>
                              {state.categories
                                .filter(c => c.id !== editCategory?.id)
                                .map((c, idx) => (
                                  <option key={`cat-bar-parent-${c.id || idx}`} value={c.id}>Under "{c.name}"</option>
                                ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <span className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Seq No</span>
                              <input
                                type="number"
                                min="1"
                                value={plc.sequence}
                                onChange={(e) => {
                                  const list = [...(editCategory.menuPlacements || [])];
                                  list[pIdx].sequence = parseInt(e.target.value) || 1;
                                  setEditCategory(prev => ({ ...(prev || {}), menuPlacements: list }));
                                }}
                                className="w-full p-1 border text-[10px] font-mono rounded text-center font-bold text-slate-700"
                              />
                            </div>
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Visible</span>
                              <input
                                type="checkbox"
                                checked={plc.enabled}
                                onChange={(e) => {
                                  const list = [...(editCategory.menuPlacements || [])];
                                  list[pIdx].enabled = e.target.checked;
                                  setEditCategory(prev => ({ ...(prev || {}), menuPlacements: list }));
                                }}
                                className="w-3.5 h-3.5 text-rose-600 rounded cursor-pointer mt-0.5"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9.5px] text-slate-400 italic">Currently matching Navbar Settings (Legacy) above.</p>
                )}
              </div>

              {/* Category SEO Box */}
              <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[10px] uppercase text-rose-850">SEO Metas</span>
                  <button
                    onClick={() => handleGenerateSEO('category', editCategory?.name || '', editCategory?.description || '', (title, desc, keys) => {
                      setEditCategory(prev => ({
                        ...(prev || {}),
                        metaTitle: title,
                        metaDescription: desc,
                        metaKeywords: keys
                      }));
                    })}
                    disabled={aiGenerating}
                    className="p-1 px-2 text-[9px] bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1 cursor-pointer"
                  >
                    {aiGenerating ? '...' : 'Generate AI SEO'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Meta search page title"
                  value={editCategory?.metaTitle || ''}
                  onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), metaTitle: e.target.value }))}
                  className="w-full p-1.5 bg-white border text-xs font-mono rounded"
                />
                <textarea
                  rows={2}
                  placeholder="Meta Google description"
                  value={editCategory?.metaDescription || ''}
                  onChange={(e) => setEditCategory(prev => ({ ...(prev || {}), metaDescription: e.target.value }))}
                  className="w-full p-1.5 bg-white border text-xs font-mono rounded"
                />
              </div>

              {editCategory && (
                <div className="mt-4">
                  <SEOAssistantWidget
                    type="category"
                    item={editCategory}
                    onChangeFields={(updates) => setEditCategory(prev => ({ ...(prev || {}), ...updates }))}
                    state={state}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                {editCategory && (
                  <button onClick={() => setEditCategory(null)} className="px-3 py-1 bg-slate-100 rounded text-slate-500">Cancel</button>
                )}
                <button
                  onClick={() => {
                    const isNew = !editCategory || !editCategory.id;
                    const defaultCategory = {
                      id: `cat-${Math.floor(Math.random() * 10000)}`,
                      name: 'New Custom Category',
                      slug: 'new-custom-category',
                      image: 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop',
                      description: 'Custom added segment.',
                      metaTitle: '',
                      metaDescription: '',
                      metaKeywords: ''
                    };
                    
                    const payload = isNew
                      ? { ...defaultCategory, ...editCategory }
                      : { ...(defaultCategory), ...editCategory } as Category;

                    const list = [...state.categories];
                    const idx = list.findIndex(c => c.id === payload.id);
                    if (idx >= 0) {
                      list[idx] = payload as Category;
                    } else {
                      list.push(payload as Category);
                    }
                    onUpdateState({ ...state, categories: list });
                    setEditCategory(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BRANDS MANAGEMENT SECTION */}
      {activeSubTab === 'brands' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-semibold text-slate-800 text-sm tracking-wider uppercase">Associated Gifting Brands</h4>
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  <tr>
                    <th className="p-3">Brand Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {state.brands.map(b => (
                    <tr key={b.id}>
                      <td className="p-3 font-semibold text-slate-800 flex items-center gap-2">
                        <img src={b.logo} className="w-8 h-8 rounded object-cover" alt="" />
                        {b.name}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-500">{b.slug}</td>
                      <td className="p-3 text-xs text-slate-400 truncate max-w-[200px]">{b.description}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setEditBrand(b)}
                          className="px-2 py-1 text-[11px] bg-slate-100 rounded hover:bg-slate-200"
                        >
                          Modify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ADD / EDIT BRAND FORM */}
          <div className="p-5 bg-white border border-slate-150 rounded-xl space-y-4 h-fit">
            <h4 className="font-semibold text-slate-800">{editBrand?.id ? 'Edit Brand' : 'Create New Brand'}</h4>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={editBrand?.name || ''}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    setEditBrand(prev => ({ ...(prev || {}), name: e.target.value, slug }));
                  }}
                  className="w-full p-2 border bg-slate-50 rounded"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={editBrand?.logo || ''}
                  onChange={(e) => setEditBrand(prev => ({ ...(prev || {}), logo: e.target.value }))}
                  className="w-full p-2 border bg-slate-50 rounded font-mono"
                  placeholder="Paste direct brand logo URL..."
                />
                <div className="mt-1.5 border border-dashed border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center hover:bg-slate-100/70 hover:border-rose-450 transition relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64Url = event.target?.result as string;
                          if (base64Url) {
                            setEditBrand(prev => ({ ...(prev || {}), logo: base64Url }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="flex items-center justify-center gap-1.5 text-slate-500">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-semibold">Upload local brand logo</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Overview Description</label>
                <textarea
                  rows={2}
                  value={editBrand?.description || ''}
                  onChange={(e) => setEditBrand(prev => ({ ...(prev || {}), description: e.target.value }))}
                  className="w-full p-2 border bg-slate-50 rounded"
                />
              </div>

              {/* Brand SEO Box */}
              <div className="bg-rose-50/50 p-3 rounded-lg border border-rose-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[10px] uppercase text-rose-850">SEO Metas</span>
                  <button
                    onClick={() => handleGenerateSEO('brand', editBrand?.name || '', editBrand?.description || '', (title, desc, keys) => {
                      setEditBrand(prev => ({
                        ...(prev || {}),
                        metaTitle: title,
                        metaDescription: desc,
                        metaKeywords: keys
                      }));
                    })}
                    disabled={aiGenerating}
                    className="p-1 px-2 text-[9px] bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1 cursor-pointer"
                  >
                    {aiGenerating ? '...' : 'Generate AI SEO'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Meta Google webpage title"
                  value={editBrand?.metaTitle || ''}
                  onChange={(e) => setEditBrand(prev => ({ ...(prev || {}), metaTitle: e.target.value }))}
                  className="w-full p-1.5 bg-white border text-xs font-mono rounded"
                />
                <textarea
                  rows={2}
                  placeholder="Meta keywords description tags"
                  value={editBrand?.metaDescription || ''}
                  onChange={(e) => setEditBrand(prev => ({ ...(prev || {}), metaDescription: e.target.value }))}
                  className="w-full p-1.5 bg-white border text-xs font-mono rounded"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editBrand && (
                  <button onClick={() => setEditBrand(null)} className="px-3 py-1 bg-slate-100 rounded text-slate-500">Cancel</button>
                )}
                <button
                  onClick={() => {
                    const isNew = !editBrand || !editBrand.id;
                    const defaultBrand = {
                      id: `brand-${Math.floor(Math.random() * 10000)}`,
                      name: 'New Custom Brand',
                      slug: 'new-custom-brand',
                      logo: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=150&auto=format&fit=crop',
                      description: 'Custom added brand profile.',
                      metaTitle: '',
                      metaDescription: '',
                      metaKeywords: ''
                    };
                    
                    const payload = isNew
                      ? { ...defaultBrand, ...editBrand }
                      : { ...defaultBrand, ...editBrand } as Brand;

                    const list = [...state.brands];
                    const idx = list.findIndex(b => b.id === payload.id);
                    if (idx >= 0) {
                      list[idx] = payload as Brand;
                    } else {
                      list.push(payload as Brand);
                    }
                    onUpdateState({ ...state, brands: list });
                    setEditBrand(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs"
                >
                  Save Brand
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-[#020202]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-indigo-600 block">Inventory Operation manager</span>
                <h3 className="font-bold text-slate-800 text-sm">Adjust Stock: {adjustingProduct.name}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Stock</span>
                  <span className="text-sm font-mono font-black text-indigo-700">{adjustingProduct.stock} units</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Projected Stock</span>
                  <span className="text-sm font-mono font-black text-slate-905">
                    {(() => {
                      const qtyVal = Number(adjustmentQty) || 0;
                      if (qtyVal <= 0) return `${adjustingProduct.stock} units`;
                      let res = adjustingProduct.stock;
                      if (adjustmentType === 'add') {
                        res += qtyVal;
                      } else if (adjustmentType === 'writeoff') {
                        res = Math.max(0, res - qtyVal);
                      } else if (adjustmentType === 'override') {
                        res = qtyVal;
                      }
                      return `${res} units`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Adjustment Mode Options */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Operation Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      adjustmentType === 'add' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Add Qty
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('writeoff')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      adjustmentType === 'writeoff' 
                        ? 'bg-rose-50 border-rose-500 text-rose-700 font-extrabold shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Write-Off
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('override')}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      adjustmentType === 'override' 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold shadow-xs' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Set Count
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {adjustmentType === 'add' ? 'Quantity to Add' : adjustmentType === 'writeoff' ? 'Quantity to Write-Off (Damage/Waste)' : 'New Absolute Stock Level'}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10"
                  value={adjustmentQty}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value);
                    setAdjustmentQty(isNaN(parsed) || parsed < 0 ? '' : parsed);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-250 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Audit Reason */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Reason / Reference Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received fresh shipment from vendor #3, Waste due to expiry"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-250 rounded-lg text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setAdjustingProduct(null)} 
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const qty = Number(adjustmentQty);
                  if (qty < 0 || (adjustmentType !== 'override' && qty === 0)) {
                    alert('Please specify a valid quantity greater than zero.');
                    return;
                  }
                  
                  const list = [...state.products];
                  const idx = list.findIndex(p => p.id === adjustingProduct.id);
                  if (idx >= 0) {
                    const currentStock = list[idx].stock;
                    let nextStock = currentStock;
                    
                    if (adjustmentType === 'add') {
                      nextStock = currentStock + qty;
                    } else if (adjustmentType === 'writeoff') {
                      nextStock = Math.max(0, currentStock - qty);
                    } else if (adjustmentType === 'override') {
                      nextStock = qty;
                    }
                    
                    list[idx] = { ...list[idx], stock: nextStock };
                    
                    onUpdateState({ ...state, products: list });
                    const reasonStr = adjustmentNote.trim() ? ` (Reason: ${adjustmentNote.trim()})` : '';
                    alert(`Successfully modified inventory for "${adjustingProduct.name}". Stock updated from ${currentStock} to ${nextStock}${reasonStr}.`);
                    setAdjustingProduct(null);
                    setAdjustmentQty('');
                    setAdjustmentNote('');
                  }
                }}
                className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Apply Adjustments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
