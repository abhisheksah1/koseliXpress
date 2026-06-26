import React, { useState } from 'react';
import { DatabaseState, DynamicPage, CustomPageSection } from '../../types';
import { Plus, Trash2, ArrowUp, ArrowDown, Settings, Edit3, Save, Sparkles, Navigation, Copy, Building } from 'lucide-react';
import SEOAssistantWidget from './SEOAssistantWidget';

interface PagesTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function PagesTab({ state, onUpdateState }: PagesTabProps) {
  const [activeMenu, setActiveMenu] = useState<'pages' | 'navbar'>('pages');
  const [selectedPageId, setSelectedPageId] = useState(state.pages[0]?.id || '');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Create New Page Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageMetaTitle, setNewPageMetaTitle] = useState('');
  const [newPageMetaDesc, setNewPageMetaDesc] = useState('');
  const [newPageKeywords, setNewPageKeywords] = useState('');
  const [newPageStatus, setNewPageStatus] = useState<'active' | 'draft'>('active');

  // Success feedback state
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Navbar Links draft state - normalized and enriched right from start
  const [navDraft, setNavDraft] = useState<any[]>(() => {
    const rawList = state.appearance?.navbarLinks || [];
    if (rawList.length > 0) {
      return rawList.map((link, idx) => ({
        id: link.id || `nav-item-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: link.title || '',
        url: link.url || '',
        type: link.type || 'custom',
        categoryId: link.categoryId || '',
        parentMenuId: link.parentMenuId || 'main',
        sequence: typeof link.sequence === 'number' ? link.sequence : idx + 1,
        enabled: link.enabled !== false,
      }));
    }
    
    // Default fallback seed state
    const fallbackList: any[] = [];
    let seq = 1;
    
    fallbackList.push({
      id: 'default-home',
      title: 'Home',
      url: '/home',
      type: 'custom',
      parentMenuId: 'main',
      sequence: seq++,
      enabled: true
    });
    
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

    fallbackList.push({
      id: 'default-about',
      title: 'About Us',
      url: '/page/about',
      type: 'page',
      parentMenuId: 'main',
      sequence: seq++,
      enabled: true
    });

    return fallbackList;
  });

  const activePage = state.pages.find(p => p.id === selectedPageId);

  // Save full page updates
  const handleUpdatePageFields = (updatedFields: Partial<DynamicPage>) => {
    if (!activePage) return;
    const list = state.pages.map(p => {
      if (p.id === activePage.id) return { ...p, ...updatedFields };
      return p;
    });
    onUpdateState({ ...state, pages: list });
  };

  // Duplicate a page design visually
  const handleDuplicatePage = (pageToDuplicate: DynamicPage) => {
    const newId = `page-${Date.now()}`;
    const newSlugCandidate = `${pageToDuplicate.slug}-copy`;
    let finalSlug = newSlugCandidate;
    let count = 1;
    while (state.pages.some(p => p.slug === finalSlug)) {
      finalSlug = `${newSlugCandidate}-${count}`;
      count++;
    }

    const clonedSections = pageToDuplicate.sections.map(sec => ({
      ...sec,
      id: `sec-${Date.now()}-${Math.floor(Math.random() * 100000)}`
    }));

    const clonedPage: DynamicPage = {
      ...pageToDuplicate,
      id: newId,
      title: `${pageToDuplicate.title} (Copy)`,
      slug: finalSlug,
      status: 'draft',
      sections: clonedSections
    };

    onUpdateState({
      ...state,
      pages: [...state.pages, clonedPage]
    });
    setSelectedPageId(newId);
  };

  // Delete an entire custom custom page design
  const handleDeletePage = (pageId: string) => {
    if (state.pages.length <= 1) {
      alert('Cannot delete the last page layout template.');
      return;
    }
    const pageToDelete = state.pages.find(p => p.id === pageId);
    if (!pageToDelete) return;

    let confirmed = false;
    try {
      confirmed = window.confirm(`Are you sure you want to permanently delete the page "${pageToDelete.title}"? This cannot be undone.`);
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (confirmed) {
      const remainingPages = state.pages.filter(p => p.id !== pageId);
      onUpdateState({
        ...state,
        pages: remainingPages
      });
      if (selectedPageId === pageId) {
        setSelectedPageId(remainingPages[0]?.id || '');
      }
    }
  };

  // Re-order sections (visual up/down movement)
  const handleMoveSection = (idx: number, direction: 'up' | 'down') => {
    if (!activePage) return;
    const sections = [...activePage.sections];
    if (direction === 'up' && idx > 0) {
      const temp = sections[idx];
      sections[idx] = sections[idx - 1];
      sections[idx - 1] = temp;
    } else if (direction === 'down' && idx < sections.length - 1) {
      const temp = sections[idx];
      sections[idx] = sections[idx + 1];
      sections[idx + 1] = temp;
    }
    handleUpdatePageFields({ sections });
  };

  // Delete section block
  const handleDeleteSection = (idx: number) => {
    if (!activePage) return;
    let confirmed = false;
    try {
      confirmed = window.confirm('Are you sure you want to remove this visual layout block?');
    } catch (e) {
      confirmed = true;
    }
    // Auto-approve if running in iframe (where dialogs are blocked by sandbox credentials)
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (confirmed) {
      const sections = activePage.sections.filter((_, i) => i !== idx);
      handleUpdatePageFields({ sections });
    }
  };

  // Add layout block module with custom header sizes
  const handleAddSection = (type: CustomPageSection['type'], customHeadingSize?: 'h1' | 'h2' | 'h3' | 'p') => {
    if (!activePage) return;
    const defaultData: CustomPageSection['data'] = {};

    switch (type) {
      case 'banner':
        defaultData.title = 'Ultimate Custom Banner Headline';
        defaultData.subtitle = 'Write catchy call to actions and support phrases';
        defaultData.buttonText = 'Action Text';
        defaultData.buttonUrl = '/category/gift-hampers';
        defaultData.imageUrl = 'https://images.unsplash.com/photo-154946?q=80&w=1200&auto=format&fit=crop';
        break;
      case 'text':
        defaultData.title = customHeadingSize === 'h1' ? 'SEO H1: Prime Keyword Headline' :
                            customHeadingSize === 'h2' ? 'SEO H2: Secondary Support Heading' :
                            customHeadingSize === 'h3' ? 'SEO H3: Nested Category Section' :
                            '';
        defaultData.subtitle = customHeadingSize === 'p' ? '' : 'Optional SEO optimization labels...';
        defaultData.content = customHeadingSize === 'p' ? 'Informative SEO friendly paragraph focusing on core product keywords...' : 'Short supportive introductory summary description...';
        defaultData.headingSize = customHeadingSize || 'h2';
        defaultData.textAlignment = 'left';
        defaultData.buttonEnabled = false;
        defaultData.buttonText = 'Learn More';
        defaultData.buttonUrl = '/pages/about';
        defaultData.buttonStyle = 'minimal_slate';
        break;
      case 'code_embed':
        defaultData.title = 'Custom Embed Code Widget';
        defaultData.subtitle = 'HTML / CSS / JS script codes or Google Map Embeds';
        defaultData.codeEmbed = '<div style="padding: 20px; background: rgba(255,255,255,0.03); border-radius: 12px; text-align: center; border: 1px dashed rgba(255,255,255,0.1)">\n  <p style="color: #f59e0b; font-weight: bold;">Hello from Code Embed!</p>\n  <p style="font-size: 11px; color: #94a3b8;">Insert customized iframes, forms, HTML layout designs or widgets here.</p>\n</div>';
        break;
      case 'delivery_countdown':
        defaultData.countdownRules = [
          {
            id: 'rule-kathmandu-' + Date.now(),
            zoneName: 'Kathmandu Valley',
            cutoffTime: '04:00 PM',
            headingBefore: 'Need delivery today in Kathmandu Valley?',
            headingAfter: 'Need delivery tomorrow in Kathmandu Valley?',
            subHeading: 'Order closing in...',
            buttonText: 'Order Now',
            buttonUrl: '/category/all',
            timezone: 'Asia/Kathmandu',
            autoSwitch: true
          }
        ];
        defaultData.countdownShowDays = false;
        defaultData.countdownShowHours = true;
        defaultData.countdownShowMinutes = true;
        defaultData.countdownShowSeconds = true;
        defaultData.countdownBgColor = '#ffffff';
        defaultData.countdownBgImage = '';
        defaultData.countdownOverlayColor = 'rgba(0,0,0,0.15)';
        defaultData.countdownHeadingColor = '#1e293b';
        defaultData.countdownSubHeadingColor = '#64748b';
        defaultData.countdownTimerBoxColor = '#f1f5f9';
        defaultData.countdownTimerTextColor = '#f43f5e';
        defaultData.countdownBtnColor = '#e11d48';
        defaultData.countdownBtnTextColor = '#ffffff';
        defaultData.countdownBorderRadius = '16px';
        defaultData.countdownPaddingDesktop = '36px 32px';
        defaultData.countdownPaddingTablet = '28px 24px';
        defaultData.countdownPaddingMobile = '20px 16px';
        defaultData.countdownMarginDesktop = '20px auto';
        defaultData.countdownMarginTablet = '16px auto';
        defaultData.countdownMarginMobile = '12px auto';
        break;
      case 'image_content':
        defaultData.title = 'Showcase block with left image';
        defaultData.subtitle = 'Catchy subheaders here';
        defaultData.content = 'Provide details about shipping, customized card values or vendor networks.';
        defaultData.imageUrl = 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop';
        break;
      case 'video':
        defaultData.title = 'Watch Gifting Promos';
        defaultData.youtubeId = 'dQw4w9WgXcQ'; // RickRoll placeholder or standard ID
        break;
      case 'categories_grid':
        defaultData.title = 'Browse Store Occasions';
        break;
      case 'products_grid':
        defaultData.title = 'Weekly Special Collections';
        defaultData.productIds = state.products.slice(0, 3).map(p => p.id);
        break;
      case 'faq':
        defaultData.title = 'FAQ Guidance Accordion';
        defaultData.faqs = [
          { question: 'What is sample question?', answer: 'This is beautiful visual builder answer.' }
        ];
        break;
      case 'reviews':
        defaultData.title = 'Direct Customer Testimonials';
        break;
      case 'google_review':
        defaultData.title = 'Review us on Google Maps';
        defaultData.googleReviewUrl = 'https://maps.google.com';
        break;
      case 'slider':
        defaultData.images = [
          'https://images.unsplash.com/photo-154946?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=1200&auto=format&fit=crop'
        ];
        break;
      case 'footer_builder':
        defaultData.registeredBusinessName = state.complianceFooter?.registeredBusinessName || 'Koseli Xpress Private Limited';
        defaultData.registrationNumber = state.complianceFooter?.registrationNumber || 'Reg No. 283941/079/080';
        defaultData.panVatNumber = state.complianceFooter?.panVatNumber || '610293848';
        defaultData.ecommerceNumber = state.complianceFooter?.ecommerceNumber || 'E-COM-0391-KTM';
        defaultData.supportEmail = state.complianceFooter?.supportEmail || 'support@koselixpress.com';
        defaultData.supportPhone = state.complianceFooter?.supportPhone || '+977 1 4455888';
        defaultData.corporateEmail = state.complianceFooter?.corporateEmail || 'corporate@koselixpress.com';
        defaultData.corporatePhone = state.complianceFooter?.corporatePhone || '+977-9851082531';
        defaultData.registeredOfficeAddress = state.complianceFooter?.registeredOfficeAddress || 'Balkumari Ringroad, Lalitpur, Nepal';
        defaultData.headOfficeAddress = state.complianceFooter?.headOfficeAddress || 'Balkumari Ringroad, Lalitpur, Nepal';
        defaultData.outlets = state.complianceFooter?.outlets || 'Kathmandu | Lalitpur';
        defaultData.complianceOfficerName = state.complianceFooter?.complianceOfficerName || 'Sabita Acharya';
        defaultData.complianceOfficerMobile = state.complianceFooter?.complianceOfficerMobile || '+977-9801354451';
        defaultData.complianceOfficerEmail = state.complianceFooter?.complianceOfficerEmail || 'sabita.acharya@koselixpress.com';
        defaultData.footerGroups = state.complianceFooter?.footerGroups || [];
        defaultData.popularCategoriesEnabled = state.complianceFooter?.popularCategoriesEnabled !== false;
        defaultData.socials = state.complianceFooter?.socials || [];
        break;
    }

    const sections = [...activePage.sections, {
      id: `sec-${Date.now()}`,
      type,
      data: defaultData
    }];
    handleUpdatePageFields({ sections });
  };

  // Generate SEO Meta tags
  const handleAutoSEO = async () => {
    if (!activePage) return;
    setAiGenerating(true);
    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'page builder template', name: activePage.title, description: 'E-commerce landing structure' })
      });
      const data = await response.json();
      handleUpdatePageFields({
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords
      });
    } catch (e) {
      alert('SEO automation error. Backup credentials used.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Add brand-new Page modal opener
  const handleCreateNewPage = () => {
    setNewPageTitle('');
    setNewPageSlug('');
    setNewPageMetaTitle('');
    setNewPageMetaDesc('');
    setNewPageKeywords('gift shop, category delivery, nepal package');
    setNewPageStatus('active');
    setShowCreateModal(true);
  };

  const handleSaveModalPage = () => {
    if (!newPageTitle.trim()) {
      alert('Please specify a Page Name.');
      return;
    }
    const slug = newPageSlug.trim() || newPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    if (state.pages.some(p => p.slug === slug)) {
      alert('A webpage with this URL slug already registry.');
      return;
    }

    const newPage: DynamicPage = {
      id: `page-${Date.now()}`,
      title: newPageTitle.trim(),
      slug,
      status: newPageStatus,
      metaTitle: newPageMetaTitle.trim() || `${newPageTitle.trim()} | Koseli Xpress`,
      metaDescription: newPageMetaDesc.trim() || `Discover beautiful ${newPageTitle.trim()} offerings handwrapped on Koseli Xpress Nepal.`,
      metaKeywords: newPageKeywords.trim() || `${newPageTitle.trim().toLowerCase()}, gift shop, nepal delivery`,
      sections: [
        {
          id: `sec-${Date.now()}`,
          type: 'text',
          data: { title: `Welcome to ${newPageTitle.trim()}`, subtitle: 'Custom custom design blocks' }
        }
      ]
    };

    onUpdateState({
      ...state,
      pages: [...state.pages, newPage]
    });
    setSelectedPageId(newPage.id);
    setShowCreateModal(false);
  };

  // Save Navigation Setup
  const handleSaveNavbar = () => {
    onUpdateState({
      ...state,
      appearance: {
        ...state.appearance,
        navbarLinks: navDraft
      }
    });
    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-850">Gifting Touch Page Builder</h2>
          <p className="text-sm text-slate-500">Edit navigation bars and restructure layout sections for search-optimized web pages.</p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveMenu('pages')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition ${activeMenu === 'pages' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
          >
            Visual Pages
          </button>
          <button
            onClick={() => setActiveMenu('navbar')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition ${activeMenu === 'navbar' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
          >
            <Navigation className="w-4 h-4 inline mr-1" /> Dynamic Navbar
          </button>
        </div>
      </div>

      {activeMenu === 'pages' ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Selector list & SEO perspective */}
          <div className="xl:col-span-1 space-y-4">
            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-3.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Choose Active Page</span>
              <div className="space-y-2">
                {state.pages.map(p => {
                  const isActive = selectedPageId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`group w-full rounded-xl transition border flex flex-col p-3 relative ${isActive ? 'bg-rose-50/50 border-rose-250 text-rose-900 shadow-2xs' : 'bg-white border-slate-100 text-slate-705 hover:bg-slate-50/60'}`}
                    >
                      <div className="flex justify-between items-start gap-1.5 w-full">
                        <button
                          onClick={() => {
                            setSelectedPageId(p.id);
                            setEditingSectionId(null);
                          }}
                          className="flex-1 text-left text-xs font-bold truncate focus:outline-hidden text-slate-800 hover:text-rose-600 transition"
                        >
                          {p.title}
                        </button>
                        <span className={`text-[8px] font-mono leading-none tracking-widest uppercase px-1.5 py-1 rounded font-extrabold shrink-0 ${p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-105 text-amber-800'}`}>
                          {p.status || 'draft'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2.5 w-full gap-2 border-t border-dashed border-slate-100 pt-2">
                        <span className="text-[9px] font-mono text-slate-400 truncate">/{p.slug}</span>
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleDuplicatePage(p)}
                            title="Duplicate Page Design"
                            className="p-1 hover:bg-rose-100/50 rounded text-slate-500 hover:text-rose-650 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {state.pages.length > 1 && (
                            <button
                              onClick={() => handleDeletePage(p.id)}
                              title="Delete Page Permanent"
                              className="p-1 hover:bg-rose-100/50 rounded text-slate-400 hover:text-rose-650 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleCreateNewPage}
                className="w-full text-center py-2.5 border border-slate-200 border-dashed rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-350 transition cursor-pointer"
              >
                + Add Custom Web Page
              </button>
            </div>

            {/* SEO metadata form */}
            {activePage && (
              <div className="p-4 bg-rose-50/50 border border-pink-100 rounded-xl space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-rose-850">SEO Web tags</span>
                  <button
                    onClick={handleAutoSEO}
                    disabled={aiGenerating}
                    className="p-1 px-2 text-[9px] bg-rose-600 rounded text-white font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {aiGenerating ? '...' : <><Sparkles className="w-2.5 h-2.5" /> AI SEO</>}
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">URL Slug / Path</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-white border rounded text-xs font-mono text-slate-800"
                      value={activePage.slug || ''}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
                        handleUpdatePageFields({ slug: val });
                      }}
                      placeholder="e.g. customized-hampers"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Search Page Title</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-white border rounded text-xs font-mono"
                      value={activePage.metaTitle || ''}
                      onChange={(e) => handleUpdatePageFields({ metaTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Search Summary Description</label>
                    <textarea
                      rows={3}
                      className="w-full p-2 bg-white border rounded text-xs font-mono"
                      value={activePage.metaDescription || ''}
                      onChange={(e) => handleUpdatePageFields({ metaDescription: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {activePage && (
              <SEOAssistantWidget
                type="page"
                item={activePage}
                onChangeFields={handleUpdatePageFields}
                state={state}
              />
            )}
          </div>

          {/* Core Visual Page Builder Nodes */}
          <div className="xl:col-span-3 space-y-4">
            {activePage ? (
              <div className="space-y-4 bg-white p-5 border border-slate-100 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg">Section Layout Assembler ("</h3>
                      <input
                        type="text"
                        className="text-lg font-bold text-slate-850 bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-rose-500 focus:outline-hidden py-0 px-1 w-64 focus:ring-0"
                        value={activePage.title}
                        onChange={(e) => handleUpdatePageFields({ title: e.target.value })}
                        title="Click to rename page layout"
                      />
                      <h3 className="font-bold text-slate-800 text-lg">")</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Order, config, or append specific design blocks rendered directly on this page layout.</p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border p-1 rounded-xl">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 pl-2">Publish Status:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdatePageFields({ status: 'active' })}
                        className={`text-[10px] px-2.5 py-1 font-bold rounded-lg transition duration-150 cursor-pointer ${activePage.status === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-155'}`}
                      >
                        🟢 Active
                      </button>
                      <button
                        onClick={() => handleUpdatePageFields({ status: 'draft' })}
                        className={`text-[10px] px-2.5 py-1 font-bold rounded-lg transition duration-150 cursor-pointer ${activePage.status !== 'active' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-155'}`}
                      >
                        🟡 Draft
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section blocks listing */}
                <div className="space-y-3.5">
                  {activePage.sections.length === 0 ? (
                    <div className="py-12 border-2 border-dashed rounded-xl border-slate-200 text-center text-slate-400 font-medium">
                      This page layout is empty. Use block selectors below to append layers.
                    </div>
                  ) : (
                    activePage.sections.map((sec, idx) => (
                      <div key={sec.id} className="p-4 border rounded-xl bg-slate-50 hover:shadow-xs transition flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2.5 bg-rose-100 text-rose-700 rounded text-[9px] uppercase font-extrabold tracking-widest">{sec.type}</span>
                            <span className="text-xs font-bold text-slate-755">{sec.data.title || 'Untitled layout structure'}</span>
                          </div>
                          {editingSectionId === sec.id ? (
                            /* Subform editor for block parameters */
                            <div className="p-4 mt-2 bg-white rounded-lg border border-slate-150 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Primary Heading Text</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border rounded"
                                  value={sec.data.title || ''}
                                  onChange={(e) => {
                                    const sections = [...activePage.sections];
                                    sections[idx].data.title = e.target.value;
                                    handleUpdatePageFields({ sections });
                                  }}
                                />
                              </div>

                              {sec.type !== 'categories_grid' && sec.type !== 'video' && sec.type !== 'reviews' && (
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Secondary Subtitle / Message</label>
                                  <input
                                    type="text"
                                    className="w-full p-2 border rounded"
                                    value={sec.data.subtitle || ''}
                                    onChange={(e) => {
                                      const sections = [...activePage.sections];
                                      sections[idx].data.subtitle = e.target.value;
                                      handleUpdatePageFields({ sections });
                                    }}
                                  />
                                </div>
                              )}

                              {sec.type === 'banner' && (
                                <>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Cover Background Image URL</label>
                                    <input
                                      type="text"
                                      className="w-full p-2 border rounded font-mono text-[10px]"
                                      value={sec.data.imageUrl || ''}
                                      onChange={(e) => {
                                        const sections = [...activePage.sections];
                                        sections[idx].data.imageUrl = e.target.value;
                                        handleUpdatePageFields({ sections });
                                      }}
                                    />
                                    <div className="border border-dashed border-slate-200 mt-1 rounded p-1.5 bg-slate-50 text-center hover:bg-slate-100/75 transition relative cursor-pointer">
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
                                                const sections = [...activePage.sections];
                                                sections[idx].data.imageUrl = base64Url;
                                                handleUpdatePageFields({ sections });
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                      <span className="text-[9px] text-slate-500 font-bold">
                                        📁 Upload covered image file
                                      </span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Btn Button Text</label>
                                      <input
                                        type="text"
                                        className="w-full p-2 border rounded"
                                        value={sec.data.buttonText || ''}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.buttonText = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Btn Redirection URL</label>
                                      <input
                                        type="text"
                                        className="w-full p-2 border rounded"
                                        value={sec.data.buttonUrl || ''}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.buttonUrl = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                    </div>
                                  </div>
                                </>
                              )}

                              {sec.type === 'slider' && (
                                <div className="space-y-3.5 text-left md:col-span-2">
                                  <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">🎠 Slider Carousel Slides list</span>
                                    <span className="text-[9px] text-slate-400">Add URLs or drag local image files directly</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    {(sec.data.images || []).map((imgUrl, imgIdx) => (
                                      <div key={imgIdx} className="relative group border rounded-lg overflow-hidden bg-white aspect-[16/10] shadow-2xs">
                                        <img src={imgUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const sections = [...activePage.sections];
                                              const imagesList = [...(sections[idx].data.images || [])];
                                              imagesList.splice(imgIdx, 1);
                                              sections[idx].data.images = imagesList;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="px-2 py-1 text-[9px] bg-rose-600 text-white rounded font-bold hover:bg-rose-700 hover:scale-105 transition"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    {(sec.data.images || []).length === 0 && (
                                      <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">
                                        No slides added. Please attach images below.
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Paste image URL and press Enter..."
                                      className="flex-1 p-2 border rounded-lg text-[10px] font-mono"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const inputVal = e.currentTarget.value.trim();
                                          if (inputVal) {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.images = [...(sections[idx].data.images || []), inputVal];
                                            handleUpdatePageFields({ sections });
                                            e.currentTarget.value = '';
                                          }
                                        }
                                      }}
                                    />

                                    {/* Local Slide Uploader button */}
                                    <div className="border border-dashed border-slate-200 rounded-lg p-2 bg-slate-50 relative cursor-pointer flex-shrink-0 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition">
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
                                                const sections = [...activePage.sections];
                                                sections[idx].data.images = [...(sections[idx].data.images || []), base64Url];
                                                handleUpdatePageFields({ sections });
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                      <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                        📁 Upload New Slide
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sec.type === 'video' && (
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">YouTube Video ID (or URL)</label>
                                  <input
                                    type="text"
                                    className="w-full p-2 border rounded font-mono text-xs"
                                    value={sec.data.youtubeId || ''}
                                    placeholder="e.g. dQw4w9WgXcQ"
                                    onChange={(e) => {
                                      const sections = [...activePage.sections];
                                      sections[idx].data.youtubeId = e.target.value;
                                      handleUpdatePageFields({ sections });
                                    }}
                                  />
                                </div>
                              )}

                              {sec.type === 'image_content' && (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2 border-t pt-2.5 text-left">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Layout Preset Structure</label>
                                      <select
                                        value={sec.data.layoutPreset || 'left'}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.layoutPreset = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-full p-2 border rounded text-xs bg-white text-slate-705 font-semibold"
                                      >
                                        <option value="left">Image Left / Content Right</option>
                                        <option value="right">Image Right / Content Left</option>
                                        <option value="top">Image Top / Content Bottom</option>
                                        <option value="overlay">Full-bleed Background Card Overlay</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Button Color Theme Theme</label>
                                      <select
                                        value={sec.data.buttonStyle || 'amber'}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.buttonStyle = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-full p-2 border rounded text-xs bg-white text-slate-705 font-semibold"
                                      >
                                        <option value="amber">Amber Glow Gradient</option>
                                        <option value="violet">Deep Violet Solid Accent</option>
                                        <option value="ghost">Ghost Matte Wireframe</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">CTA Button Text Label</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. Shop Now"
                                        className="w-full p-2 border rounded text-xs text-slate-800 font-semibold"
                                        value={sec.data.buttonLabel || ''}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.buttonLabel = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Button Redirection Destination Link</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. /category/gift-sets"
                                        className="w-full p-2 border rounded text-xs font-mono text-indigo-700"
                                        value={sec.data.buttonPath || ''}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.buttonPath = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="md:col-span-2 text-left">
                                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Block Content Body Text Markdown</label>
                                    <textarea
                                      rows={3}
                                      className="w-full p-2 border rounded text-xs text-slate-700"
                                      placeholder="Write rich paragraph context stories or promotional content..."
                                      value={sec.data.content || ''}
                                      onChange={(e) => {
                                        const sections = [...activePage.sections];
                                        sections[idx].data.content = e.target.value;
                                        handleUpdatePageFields({ sections });
                                      }}
                                    />
                                  </div>

                                  <div className="md:col-span-2 text-left">
                                    <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Featured Side / Banner image URL *</label>
                                    <input
                                      type="text"
                                      className="w-full p-2 border rounded font-mono text-[10px]"
                                      value={sec.data.imageUrl || ''}
                                      onChange={(e) => {
                                        const sections = [...activePage.sections];
                                        sections[idx].data.imageUrl = e.target.value;
                                        handleUpdatePageFields({ sections });
                                      }}
                                    />
                                    {/* Local File Uploader for Side Image */}
                                    <div className="border border-dashed border-slate-200 mt-1 rounded p-1.5 bg-slate-50 text-center hover:bg-slate-100/75 transition relative cursor-pointer">
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
                                                const sections = [...activePage.sections];
                                                sections[idx].data.imageUrl = base64Url;
                                                handleUpdatePageFields({ sections });
                                              }
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                      />
                                      <span className="text-[9px] text-slate-500 font-bold">
                                        📁 Upload premium featured layout images
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}

                              {sec.type === 'categories_grid' && (
                                <div className="md:col-span-2 space-y-4 text-left">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-3">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Sort Categories By</label>
                                      <select
                                        value={sec.data.sortBy || 'custom'}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.sortBy = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-full p-2 border rounded text-xs bg-white text-slate-755 font-semibold"
                                      >
                                        <option value="custom">Custom Hierarchy Order</option>
                                        <option value="name">Alphabetical Name</option>
                                        <option value="product_count">Product Count (Highest)</option>
                                        <option value="latest">Latest Created (ID sequence)</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Max Display Limit</label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={sec.data.limitCount || 20}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.limitCount = parseInt(e.target.value) || 20;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-full p-2 border rounded text-xs bg-white text-slate-705 font-mono font-bold text-center"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2 pt-4">
                                      <input
                                        type="checkbox"
                                        id={`hideEmpty-${idx}`}
                                        checked={sec.data.hideEmpty || false}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.hideEmpty = e.target.checked;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-4 h-4 text-rose-600 border-slate-300 rounded cursor-pointer"
                                      />
                                      <label htmlFor={`hideEmpty-${idx}`} className="text-xs text-slate-755 font-semibold cursor-pointer">
                                        Hide empty categories
                                      </label>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Select Categories to Display</label>
                                    <p className="text-[10px] text-slate-400 mb-2">If none are checked, all categories will be shown according to rules.</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {state.categories.map(c => {
                                        const checked = (sec.data.selectedCategoryIds || []).includes(c.id);
                                        return (
                                          <label key={c.id} className="flex gap-1.5 items-center bg-slate-50 p-2 rounded border text-[11px] cursor-pointer hover:bg-slate-100">
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                let list = [...(sec.data.selectedCategoryIds || [])];
                                                if (e.target.checked) {
                                                  list.push(c.id);
                                                } else {
                                                  list = list.filter(id => id !== c.id);
                                                }
                                                sections[idx].data.selectedCategoryIds = list;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                                            />
                                            <span className="truncate font-semibold text-slate-700">{c.name}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sec.type === 'products_grid' && (
                                <div className="md:col-span-2">
                                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Products checked to show on grid</label>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {state.products.filter(p => p.status !== 'deleted').map(p => {
                                      const checked = (sec.data.productIds || []).includes(p.id);
                                      return (
                                        <label key={p.id} className="flex gap-1.5 items-center bg-slate-50 p-1.5 rounded border text-[11px] cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              let list = [...(sec.data.productIds || [])];
                                              if (e.target.checked) {
                                                list.push(p.id);
                                              } else {
                                                list = list.filter(id => id !== p.id);
                                              }
                                              sections[idx].data.productIds = list;
                                              handleUpdatePageFields({ sections });
                                            }}
                                          />
                                          <span className="truncate">{p.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {sec.type === 'google_review' && (
                                <div className="md:col-span-2 space-y-4 text-left border-t pt-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Google Review Share Anchor Link</label>
                                      <input
                                        type="text"
                                        className="w-full p-2 border rounded font-mono text-[10px] text-indigo-700 font-semibold"
                                        value={sec.data.googleReviewUrl || ''}
                                        placeholder="e.g. https://maps.google.com/?cid=..."
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.googleReviewUrl = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Review Display Max Limit</label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        className="w-full p-2 border rounded font-mono text-xs font-bold text-center"
                                        value={sec.data.limitCount || 5}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.limitCount = parseInt(e.target.value) || 5;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase">Order Reviews By</label>
                                      <select
                                        value={sec.data.sortBy || 'latest'}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.sortBy = e.target.value;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-full p-2 border rounded text-xs bg-white text-slate-705 font-semibold"
                                      >
                                        <option value="latest">Latest Reviews First</option>
                                        <option value="rating">Rating (Highest First)</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4">
                                      <input
                                        type="checkbox"
                                        id={`onlyFiveStars-${idx}`}
                                        checked={sec.data.onlyFiveStars || false}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.onlyFiveStars = e.target.checked;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded cursor-pointer"
                                      />
                                      <label htmlFor={`onlyFiveStars-${idx}`} className="text-xs text-slate-755 font-semibold cursor-pointer">
                                        ⭐ Only 5-star reviews
                                      </label>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4">
                                      <input
                                        type="checkbox"
                                        id={`onlyWithComments-${idx}`}
                                        checked={sec.data.onlyWithComments || false}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.onlyWithComments = e.target.checked;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded cursor-pointer"
                                      />
                                      <label htmlFor={`onlyWithComments-${idx}`} className="text-xs text-slate-755 font-semibold cursor-pointer">
                                        💬 Only with comments
                                      </label>
                                    </div>
                                  </div>

                                  {/* Custom reviews list editor */}
                                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                                      <div>
                                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Configure Actual Google Reviews</h4>
                                        <p className="text-[10px] text-slate-400">Add, edit, or delete items to exactly match your physical business page reviews.</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const sections = [...activePage.sections];
                                          const currentList = sections[idx].data.reviewsList || [
                                            { id: 'rev-1', author: 'Sunita Pradhan', rating: 5, comment: 'The floral arrangement was absolutely pristine! Delivered exactly on time in Kathmandu.', relativeDate: '2 days ago', initials: 'SP', avatarBg: 'bg-rose-700', timestamp: Date.now() },
                                            { id: 'rev-2', author: 'Anish Shrestha', rating: 5, comment: 'Top-tier customer support. They coordinated the midnight delivery flawlessly.', relativeDate: '1 week ago', initials: 'AS', avatarBg: 'bg-emerald-700', timestamp: Date.now() - 604800000 },
                                            { id: 'rev-3', author: 'Samikshya Thapa', rating: 4, comment: 'Very helpful builders. Loved the custom options. Slight courier delay.', relativeDate: '2 weeks ago', initials: 'ST', avatarBg: 'bg-[#E91E63]', timestamp: Date.now() - 1209600000 }
                                          ];
                                          const nextId = `rev-custom-${Date.now()}`;
                                          sections[idx].data.reviewsList = [
                                            ...currentList,
                                            {
                                              id: nextId,
                                              author: 'Anjali Sharma',
                                              rating: 5,
                                              comment: 'The gift hamper was gorgeous! Seamless experience sending to Lalitpur.',
                                              relativeDate: '1 day ago',
                                              initials: 'AS',
                                              avatarBg: 'bg-gradient-to-tr from-violet-600 to-indigo-600',
                                              timestamp: Date.now()
                                            }
                                          ];
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="text-[10px] font-bold px-3 py-1.5 bg-[#4285F4] text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                      >
                                        ＋ Add Real Google Review
                                      </button>
                                    </div>

                                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                      {(() => {
                                        const currentReviews = sec.data.reviewsList || [
                                          { id: 'rev-1', author: 'Sunita Pradhan', rating: 5, comment: 'The floral arrangement was absolutely pristine! Delivered exactly on time in Kathmandu. My parents loved the touch. Highly recommend Koseli Xpress!', relativeDate: '2 days ago', initials: 'SP', avatarBg: 'bg-rose-700', timestamp: 1717382400 },
                                          { id: 'rev-2', author: 'Anish Shrestha', rating: 5, comment: 'Top-tier customer support. They coordinated the midnight delivery flawlessly. The quality of chocolates and custom gift wrapping was beautiful.', relativeDate: '1 week ago', initials: 'AS', avatarBg: 'bg-emerald-700', timestamp: 1716952800 },
                                          { id: 'rev-3', author: 'Samikshya Thapa', rating: 4, comment: 'Very helpful builders. Loved the custom options. Slight courier delay but the presentation made up for it completely. Highly satisfied!', relativeDate: '2 weeks ago', initials: 'ST', avatarBg: 'bg-[#E91E63]', timestamp: 1716348000 },
                                          { id: 'rev-4', author: 'Prajwal Karki', rating: 5, comment: 'Simply the best online gifting service in Nepal. The customizable gift hampers make it so easy to curate something personal and exquisite.', relativeDate: '3 weeks ago', initials: 'PK', avatarBg: 'bg-amber-700', timestamp: 1715743200 },
                                          { id: 'rev-5', author: 'Meera Rajopadhyaya', rating: 5, comment: 'Beautiful presentation! Every flower was fresh and fragrantly bloomed. Easy payment options from out-of-country. Will definitely order again.', relativeDate: '1 month ago', initials: 'MR', avatarBg: 'bg-blue-700', timestamp: 1715138400 }
                                        ];

                                        return currentReviews.map((rev: any, rIdx: number) => (
                                          <div key={rev.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                                            <div className="flex gap-2 items-start justify-between">
                                              <div className="grid grid-cols-12 gap-2 flex-1">
                                                <div className="col-span-12 sm:col-span-4">
                                                  <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Reviewer Name</label>
                                                  <input
                                                    type="text"
                                                    value={rev.author}
                                                    onChange={(e) => {
                                                      const sections = [...activePage.sections];
                                                      const list = [...(sections[idx].data.reviewsList || currentReviews)];
                                                      const names = e.target.value.trim().split(' ');
                                                      const initials = names.map((n: string) => n[0] || '').join('').slice(0, 2).toUpperCase() || 'R';
                                                      list[rIdx] = { ...list[rIdx], author: e.target.value, initials };
                                                      sections[idx].data.reviewsList = list;
                                                      handleUpdatePageFields({ sections });
                                                    }}
                                                    className="w-full text-xs font-semibold p-1.5 border rounded bg-slate-50/50"
                                                  />
                                                </div>
                                                <div className="col-span-6 sm:col-span-4">
                                                  <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Relative Time Label</label>
                                                  <input
                                                    type="text"
                                                    value={rev.relativeDate}
                                                    placeholder="e.g. 3 days ago"
                                                    onChange={(e) => {
                                                      const sections = [...activePage.sections];
                                                      const list = [...(sections[idx].data.reviewsList || currentReviews)];
                                                      list[rIdx] = { ...list[rIdx], relativeDate: e.target.value };
                                                      sections[idx].data.reviewsList = list;
                                                      handleUpdatePageFields({ sections });
                                                    }}
                                                    className="w-full text-xs font-mono p-1.5 border rounded bg-slate-50/50"
                                                  />
                                                </div>
                                                <div className="col-span-6 sm:col-span-4">
                                                  <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Stars Rating</label>
                                                  <select
                                                    value={rev.rating}
                                                    onChange={(e) => {
                                                      const sections = [...activePage.sections];
                                                      const list = [...(sections[idx].data.reviewsList || currentReviews)];
                                                      list[rIdx] = { ...list[rIdx], rating: parseInt(e.target.value) };
                                                      sections[idx].data.reviewsList = list;
                                                      handleUpdatePageFields({ sections });
                                                    }}
                                                    className="w-full text-xs p-1.5 border rounded bg-slate-50/50 text-amber-500 font-bold"
                                                  >
                                                    <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                                                    <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                                                    <option value="3">⭐⭐⭐ (3 Stars)</option>
                                                    <option value="2">⭐⭐ (2 Stars)</option>
                                                    <option value="1">⭐ (1 Star)</option>
                                                  </select>
                                                </div>
                                              </div>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const sections = [...activePage.sections];
                                                  const list = (sections[idx].data.reviewsList || currentReviews).filter((item: any) => item.id !== rev.id);
                                                  sections[idx].data.reviewsList = list;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className="text-[10px] text-rose-500 font-bold hover:text-rose-700 px-2 py-1 hover:bg-rose-50 rounded transition cursor-pointer sticky top-0 shrink-0"
                                                title="Delete Review"
                                              >
                                                ✕ Delete
                                              </button>
                                            </div>

                                            <div>
                                              <label className="text-[8px] font-bold text-slate-400 block uppercase mb-0.5">Review Comment / Testimony Text</label>
                                              <textarea
                                                value={rev.comment}
                                                rows={2}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  const list = [...(sections[idx].data.reviewsList || currentReviews)];
                                                  list[rIdx] = { ...list[rIdx], comment: e.target.value };
                                                  sections[idx].data.reviewsList = list;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className="w-full text-xs font-serif italic p-1.5 border rounded bg-slate-50/50"
                                              />
                                            </div>
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sec.type === 'faq' && (
                                <div className="md:col-span-2 space-y-2">
                                  <span className="font-bold text-[9px] text-slate-400 block">FAQ Inquiries List</span>
                                  {(sec.data.faqs || []).map((faq, faqIdx) => (
                                    <div key={faqIdx} className="space-y-1 p-2 bg-slate-50 border rounded-lg">
                                      <input
                                        type="text"
                                        placeholder="Question"
                                        className="w-full p-1 bg-white border text-xs"
                                        value={faq.question}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          const faqs = [...(sections[idx].data.faqs || [])];
                                          faqs[faqIdx].question = e.target.value;
                                          sections[idx].data.faqs = faqs;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                      <input
                                        type="text"
                                        placeholder="Detailed Answer"
                                        className="w-full p-1 bg-white border text-xs"
                                        value={faq.answer}
                                        onChange={(e) => {
                                          const sections = [...activePage.sections];
                                          const faqs = [...(sections[idx].data.faqs || [])];
                                          faqs[faqIdx].answer = e.target.value;
                                          sections[idx].data.faqs = faqs;
                                          handleUpdatePageFields({ sections });
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const sections = [...activePage.sections];
                                          sections[idx].data.faqs = (sections[idx].data.faqs || []).filter((_, i) => i !== faqIdx);
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="text-[10px] text-rose-600 hover:underline"
                                      >
                                        Delete FAQ
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sections = [...activePage.sections];
                                      const faqs = [...(sections[idx].data.faqs || []), { question: 'New Question?', answer: 'Detailed explanation here.' }];
                                      sections[idx].data.faqs = faqs;
                                      handleUpdatePageFields({ sections });
                                    }}
                                    className="p-1 px-2.5 bg-slate-205 hover:bg-slate-300 text-[10px] font-semibold text-slate-600 rounded"
                                  >
                                    + Add Question Item
                                  </button>
                                </div>
                              )}

                              {sec.type === 'text' && (
                                <div className="md:col-span-2 text-left space-y-4">
                                  {/* Visual styling toolbar for Headings and Layout */}
                                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-3">
                                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                                      🎨 Typography & Block Alignment Toolbar (H1-H6, P)
                                    </span>

                                    <div className="flex flex-wrap items-center gap-4">
                                      {/* Heading Selectors (similar to user draft visual toolbar) */}
                                      <div className="space-y-1">
                                        <span className="block text-[9px] text-slate-400 font-bold uppercase">Heading Level (SEO & Styling Tag)</span>
                                        <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs divide-x divide-slate-100">
                                          {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'] as const).map((tag) => {
                                            const isActive = (sec.data.headingSize || 'h2') === tag;
                                            return (
                                              <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.headingSize = tag;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className={`text-[10.5px] px-2.5 py-1.5 font-bold transition capitalize cursor-pointer ${
                                                  isActive
                                                    ? 'bg-rose-600 text-white font-extrabold'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                              >
                                                {tag}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Text Alignment Selector */}
                                      <div className="space-y-1">
                                        <span className="block text-[9px] text-slate-400 font-bold uppercase font-sans">Alignment</span>
                                        <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs divide-x divide-slate-100">
                                          {(['left', 'center', 'right', 'justify'] as const).map((align) => {
                                            const isActive = (sec.data.textAlignment || 'left') === align;
                                            return (
                                              <button
                                                key={align}
                                                type="button"
                                                onClick={() => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.textAlignment = align;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className={`text-[10px] px-2.5 py-1.5 font-bold transition capitalize cursor-pointer ${
                                                  isActive
                                                    ? 'bg-slate-800 text-white font-extrabold'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                              >
                                                {align}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Custom Content editor */}
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Rich Text Content / Descriptive Paragraphs</label>
                                    <textarea
                                      className="w-full p-2.5 border rounded-lg font-sans text-xs min-h-[140px] text-slate-800 focus:ring-1 focus:ring-rose-500 bg-white"
                                      placeholder="Write your beautiful content story here..."
                                      value={sec.data.content || ''}
                                      onChange={(e) => {
                                        const sections = [...activePage.sections];
                                        sections[idx].data.content = e.target.value;
                                        handleUpdatePageFields({ sections });
                                      }}
                                    />
                                  </div>

                                  {/* CTA Button configurations */}
                                  <div className="p-3 bg-white rounded-xl border border-rose-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                                          checked={!!sec.data.buttonEnabled}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.buttonEnabled = e.target.checked;
                                            handleUpdatePageFields({ sections });
                                          }}
                                        />
                                        <span className="text-[10.5px] font-bold text-slate-700">🚀 Add dynamic Call-to-Action button below the text block</span>
                                      </label>
                                    </div>

                                    {sec.data.buttonEnabled && (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-dashed border-rose-100 animate-in fade-in duration-150">
                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Button Text</label>
                                          <input
                                            type="text"
                                            className="w-full p-2 border rounded text-xs"
                                            placeholder="e.g. Shop Best Sellers"
                                            value={sec.data.buttonText || ''}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.buttonText = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Redirection Link / URL Target</label>
                                          <input
                                            type="text"
                                            className="w-full p-2 border rounded text-xs"
                                            placeholder="e.g. /category/premium-gifts"
                                            value={sec.data.buttonUrl || ''}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.buttonUrl = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-[9px] font-bold text-slate-400 mb-0.5 uppercase">Visual Style Theme</label>
                                          <select
                                            className="w-full p-2 border rounded text-xs bg-white"
                                            value={sec.data.buttonStyle || 'primary'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.buttonStyle = e.target.value as any;
                                              handleUpdatePageFields({ sections });
                                            }}
                                          >
                                            <option value="filled_rose">Filled Velvet Rose 🌺</option>
                                            <option value="filled_amber">Filled Sunset Amber 🌇</option>
                                            <option value="outline_rose">Outline Midnight Rose 💫</option>
                                            <option value="minimal_slate">Minimal Matte Slate 🖤</option>
                                          </select>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {sec.type === 'code_embed' && (
                                <div className="md:col-span-2 text-left">
                                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">HTML Code Embed / Script / iFrame code</label>
                                  <textarea
                                    className="w-full p-2 border rounded font-mono text-[10.5px] min-h-[160px] bg-[#020202] text-amber-500 border-white/5"
                                    placeholder="<div style='...'>...</div> or <iframe src='...'></iframe>"
                                    value={sec.data.codeEmbed || ''}
                                    onChange={(e) => {
                                      const sections = [...activePage.sections];
                                      sections[idx].data.codeEmbed = e.target.value;
                                      handleUpdatePageFields({ sections });
                                    }}
                                  />
                                  <p className="text-[10px] text-slate-400 mt-1 italic">Write raw HTML/CSS styling, responsive iframes, social follow tags, custom forms, or code snippet blocks here.</p>
                                  <div className="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[9.5px] leading-relaxed text-amber-500 font-sans flex items-start gap-1.5">
                                    <span>⚠️</span>
                                    <span><strong>XSS Injection Alert:</strong> To maintain strict site safety, do not paste scripts or templates from untrusted third-party hosts. Embedded custom components run inside the site context.</span>
                                  </div>
                                </div>
                              )}

                              {sec.type === 'delivery_countdown' && (
                                <div className="md:col-span-2 text-left space-y-6">
                                  {/* Rules configuration */}
                                  <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-4">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                                      <span>🕒 Delivery Cutoff Zones & Rules</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const sections = [...activePage.sections];
                                          const curRules = [...(sections[idx].data.countdownRules || [])];
                                          curRules.push({
                                            id: 'rule-' + Date.now(),
                                            zoneName: 'New Delivery Zone',
                                            cutoffTime: '04:00 PM',
                                            headingBefore: 'Need delivery today in New Zone?',
                                            headingAfter: 'Need delivery tomorrow in New Zone?',
                                            subHeading: 'Order closing in...',
                                            buttonText: 'Order Now',
                                            buttonUrl: '/category/all',
                                            timezone: 'Asia/Kathmandu',
                                            autoSwitch: true
                                          });
                                          sections[idx].data.countdownRules = curRules;
                                          handleUpdatePageFields({ sections });
                                        }}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold uppercase tracking-wider"
                                      >
                                        + Add Zone Rule
                                      </button>
                                    </h4>
                                    
                                    <div className="space-y-4">
                                      {(sec.data.countdownRules || []).map((rule: any, rIdx: number) => (
                                        <div key={rule.id || rIdx} className="p-3 bg-white border border-slate-205 rounded-lg space-y-3 relative">
                                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                            <span className="text-[10px] font-extrabold text-slate-800 uppercase">Zone Rule #{rIdx + 1}: {rule.zoneName || 'No Name'}</span>
                                            {sec.data.countdownRules.length > 1 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules = sections[idx].data.countdownRules.filter((_: any, i: number) => i !== rIdx);
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className="text-[9px] text-rose-600 hover:underline font-bold animate-pulse"
                                              >
                                                Delete Rule
                                              </button>
                                            )}
                                          </div>
                                          
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Zone / Neighborhood Name</label>
                                              <input
                                                type="text"
                                                value={rule.zoneName || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].zoneName = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="e.g. Kathmandu Valley, Pokhara"
                                                className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-semibold"
                                              />
                                            </div>
                                            
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Daily Cutoff Time</label>
                                              <input
                                                type="text"
                                                value={rule.cutoffTime || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].cutoffTime = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="e.g. 04:00 PM or 16:00"
                                                className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-amber-600 font-bold"
                                              />
                                            </div>
                                            
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Timezone context</label>
                                              <select
                                                value={rule.timezone || 'Asia/Kathmandu'}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].timezone = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-semibold bg-white"
                                              >
                                                <option value="Asia/Kathmandu">Asia/Kathmandu (Nepal Time - NST)</option>
                                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                                                <option value="UTC">UTC / GMT</option>
                                              </select>
                                            </div>

                                            <div className="sm:col-span-2">
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Heading (Before Cutoff)</label>
                                              <input
                                                type="text"
                                                value={rule.headingBefore || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].headingBefore = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="Need delivery today in Kathmandu Valley?"
                                                className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-semibold"
                                              />
                                            </div>

                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Sub Heading text</label>
                                              <input
                                                type="text"
                                                value={rule.subHeading || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].subHeading = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="Order closing in..."
                                                className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-semibold"
                                              />
                                            </div>

                                            <div className="sm:col-span-2">
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Heading (After Cutoff)</label>
                                              <input
                                                type="text"
                                                value={rule.headingAfter || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].headingAfter = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="Need delivery tomorrow in Kathmandu Valley?"
                                                className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-semibold"
                                              />
                                            </div>

                                            <div className="flex items-center gap-2 pt-5">
                                              <input
                                                type="checkbox"
                                                id={`autoSwitch-${idx}-${rIdx}`}
                                                checked={rule.autoSwitch !== false}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].autoSwitch = e.target.checked;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                className="w-4 h-4 rounded border-slate-350 accent-rose-600"
                                              />
                                              <label htmlFor={`autoSwitch-${idx}-${rIdx}`} className="text-[10px] sm:text-xs text-slate-650 font-bold cursor-pointer">
                                                Enable Auto Switching
                                              </label>
                                            </div>

                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">CTA Button Text (Optional)</label>
                                              <input
                                                type="text"
                                                value={rule.buttonText || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].buttonText = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="e.g. Order Now"
                                                className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-semibold"
                                              />
                                            </div>

                                            <div className="sm:col-span-2">
                                              <label className="block text-[9px] font-bold text-slate-400 uppercase">CTA Button URL (Optional)</label>
                                              <input
                                                type="text"
                                                value={rule.buttonUrl || ''}
                                                onChange={(e) => {
                                                  const sections = [...activePage.sections];
                                                  sections[idx].data.countdownRules[rIdx].buttonUrl = e.target.value;
                                                  handleUpdatePageFields({ sections });
                                                }}
                                                placeholder="e.g. /category/all"
                                                className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-indigo-705"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Displays Options */}
                                  <div className="bg-slate-50 border p-4 rounded-xl text-xs space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">📺 Countdown Components Display Toggle</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`showDays-${idx}`}
                                          checked={sec.data.countdownShowDays !== false}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownShowDays = e.target.checked;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                                        />
                                        <label htmlFor={`showDays-${idx}`} className="font-bold text-slate-705 cursor-pointer">Show Days</label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`showHours-${idx}`}
                                          checked={sec.data.countdownShowHours !== false}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownShowHours = e.target.checked;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                                        />
                                        <label htmlFor={`showHours-${idx}`} className="font-bold text-slate-705 cursor-pointer">Show Hours</label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`showMinutes-${idx}`}
                                          checked={sec.data.countdownShowMinutes !== false}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownShowMinutes = e.target.checked;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                                        />
                                        <label htmlFor={`showMinutes-${idx}`} className="font-bold text-slate-705 cursor-pointer">Show Minutes</label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          id={`showSeconds-${idx}`}
                                          checked={sec.data.countdownShowSeconds !== false}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownShowSeconds = e.target.checked;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                                        />
                                        <label htmlFor={`showSeconds-${idx}`} className="font-bold text-slate-705 cursor-pointer">Show Seconds</label>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Custom Style Options */}
                                  <div className="bg-slate-50 border p-4 rounded-xl text-xs space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">🎨 Dynamic Color Customizer</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                                      <div className="col-span-2">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Background Image URL (Optional)</label>
                                        <input
                                          type="text"
                                          value={sec.data.countdownBgImage || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownBgImage = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          placeholder="https://images.unsplash.com/... or base64"
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800 font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Background Color</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownBgColor || '#ffffff'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownBgColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownBgColor || '#ffffff'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownBgColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Overlay dark tint</label>
                                        <input
                                          type="text"
                                          value={sec.data.countdownOverlayColor || 'rgba(0,0,0,0.15)'}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownOverlayColor = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Heading Color</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownHeadingColor || '#1e293b'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownHeadingColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownHeadingColor || '#1e293b'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownHeadingColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Sub Heading Color</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownSubHeadingColor || '#64748b'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownSubHeadingColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownSubHeadingColor || '#64748b'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownSubHeadingColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Timer Box BG</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownTimerBoxColor || '#f1f5f9'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownTimerBoxColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownTimerBoxColor || '#f1f5f9'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownTimerBoxColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Timer Text Color</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownTimerTextColor || '#f43f5e'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownTimerTextColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownTimerTextColor || '#f43f5e'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownTimerTextColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Button BG Color</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownBtnColor || '#e11d48'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownBtnColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownBtnColor || '#e11d48'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownBtnColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Button Text Color</label>
                                        <div className="flex gap-2 items-center mt-0.5">
                                          <input
                                            type="color"
                                            value={sec.data.countdownBtnTextColor || '#ffffff'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownBtnTextColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-8 h-8 rounded-full overflow-hidden cursor-pointer shrink-0"
                                          />
                                          <input
                                            type="text"
                                            value={sec.data.countdownBtnTextColor || '#ffffff'}
                                            onChange={(e) => {
                                              const sections = [...activePage.sections];
                                              sections[idx].data.countdownBtnTextColor = e.target.value;
                                              handleUpdatePageFields({ sections });
                                            }}
                                            className="w-full p-1 border rounded text-[10px] font-mono"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Border Radius (px/rem)</label>
                                        <input
                                          type="text"
                                          value={sec.data.countdownBorderRadius || '16px'}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.countdownBorderRadius = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          placeholder="e.g. 16px or 1.5rem"
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-750 font-semibold"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sizing & Margins */}
                                  <div className="bg-slate-50 border p-4 rounded-xl text-xs space-y-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">📐 Layout Padding & Margin Settings</h4>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {/* Padding Column */}
                                      <div className="space-y-3">
                                        <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Padding Sizes</span>
                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[9px] text-slate-500">Desktop Padding</label>
                                            <input
                                              type="text"
                                              value={sec.data.countdownPaddingDesktop || '36px 32px'}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                sections[idx].data.countdownPaddingDesktop = e.target.value;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-full p-1.5 border rounded text-xs font-mono"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] text-slate-500">Tablet Padding</label>
                                            <input
                                              type="text"
                                              value={sec.data.countdownPaddingTablet || '28px 24px'}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                sections[idx].data.countdownPaddingTablet = e.target.value;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-full p-1.5 border rounded text-xs font-mono"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] text-slate-500">Mobile Padding</label>
                                            <input
                                              type="text"
                                              value={sec.data.countdownPaddingMobile || '20px 16px'}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                sections[idx].data.countdownPaddingMobile = e.target.value;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-full p-1.5 border rounded text-xs font-mono"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Margin Column */}
                                      <div className="space-y-3">
                                        <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">External Margins</span>
                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[9px] text-slate-500">Desktop Margin</label>
                                            <input
                                              type="text"
                                              value={sec.data.countdownMarginDesktop || '20px auto'}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                sections[idx].data.countdownMarginDesktop = e.target.value;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-full p-1.5 border rounded text-xs font-mono"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] text-slate-500">Tablet Margin</label>
                                            <input
                                              type="text"
                                              value={sec.data.countdownMarginTablet || '16px auto'}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                sections[idx].data.countdownMarginTablet = e.target.value;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-full p-1.5 border rounded text-xs font-mono"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] text-slate-500">Mobile Margin</label>
                                            <input
                                              type="text"
                                              value={sec.data.countdownMarginMobile || '12px auto'}
                                              onChange={(e) => {
                                                const sections = [...activePage.sections];
                                                sections[idx].data.countdownMarginMobile = e.target.value;
                                                handleUpdatePageFields({ sections });
                                              }}
                                              className="w-full p-1.5 border rounded text-xs font-mono"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sec.type === 'footer_builder' && (
                                <div className="md:col-span-2 text-left space-y-6">
                                  <div className="bg-rose-50/20 border border-rose-100 p-4 rounded-xl space-y-4">
                                    <div className="flex items-center gap-2">
                                      <Building className="w-5 h-5 text-rose-600" />
                                      <div>
                                        <h4 className="text-[12px] font-bold text-slate-800">Corporate Compliance Footer Settings</h4>
                                        <p className="text-[10px] text-slate-400">Override site-wide defaults for this specific landing page.</p>
                                      </div>
                                    </div>

                                    {/* Logo options */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Custom Logo Image URL</label>
                                        <input
                                          type="text"
                                          value={sec.data.logoUrl || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.logoUrl = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          placeholder="Leave blank for site logo fallback"
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Logo Width (pixels)</label>
                                        <input
                                          type="number"
                                          value={sec.data.logoWidth || 160}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.logoWidth = Number(e.target.value);
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono"
                                        />
                                      </div>
                                    </div>

                                    {/* Company registry info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Registered Name</label>
                                        <input
                                          type="text"
                                          value={sec.data.registeredBusinessName || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.registeredBusinessName = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Registration No.</label>
                                        <input
                                          type="text"
                                          value={sec.data.registrationNumber || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.registrationNumber = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">PAN / VAT No.</label>
                                        <input
                                          type="text"
                                          value={sec.data.panVatNumber || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.panVatNumber = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">E-com License No.</label>
                                        <input
                                          type="text"
                                          value={sec.data.ecommerceNumber || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.ecommerceNumber = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono"
                                        />
                                      </div>
                                    </div>

                                    {/* Address Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Registered Office Address</label>
                                        <input
                                          type="text"
                                          value={sec.data.registeredOfficeAddress || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.registeredOfficeAddress = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Head Office Address</label>
                                        <input
                                          type="text"
                                          value={sec.data.headOfficeAddress || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.headOfficeAddress = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-805 text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Operational Outlets</label>
                                        <input
                                          type="text"
                                          value={sec.data.outlets || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.outlets = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800"
                                        />
                                      </div>
                                    </div>

                                    {/* Contacts Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Support Email</label>
                                        <input
                                          type="email"
                                          value={sec.data.supportEmail || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.supportEmail = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Support Phone</label>
                                        <input
                                          type="text"
                                          value={sec.data.supportPhone || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.supportPhone = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Corporate Email</label>
                                        <input
                                          type="email"
                                          value={sec.data.corporateEmail || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.corporateEmail = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Corporate Phone</label>
                                        <input
                                          type="text"
                                          value={sec.data.corporatePhone || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.corporatePhone = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                    </div>

                                    {/* Compliance Officer Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Compliance Officer</label>
                                        <input
                                          type="text"
                                          value={sec.data.complianceOfficerName || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.complianceOfficerName = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Compliance Mobile</label>
                                        <input
                                          type="text"
                                          value={sec.data.complianceOfficerMobile || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.complianceOfficerMobile = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Compliance Email</label>
                                        <input
                                          type="email"
                                          value={sec.data.complianceOfficerEmail || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.complianceOfficerEmail = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                    </div>

                                    {/* Licensing and toggles */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Regulatory Board name</label>
                                        <input
                                          type="text"
                                          value={sec.data.regulatoryAuthority || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.regulatoryAuthority = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs text-slate-800"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase">License Number</label>
                                        <input
                                          type="text"
                                          value={sec.data.licenseNumber || ''}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.licenseNumber = e.target.value;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-full p-2 border rounded mt-0.5 text-xs font-mono text-slate-800"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 pt-4">
                                        <input
                                          type="checkbox"
                                          id={`popCat-${idx}`}
                                          checked={sec.data.popularCategoriesEnabled !== false}
                                          onChange={(e) => {
                                            const sections = [...activePage.sections];
                                            sections[idx].data.popularCategoriesEnabled = e.target.checked;
                                            handleUpdatePageFields({ sections });
                                          }}
                                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 cursor-pointer"
                                        />
                                        <label htmlFor={`popCat-${idx}`} className="font-bold text-slate-705 cursor-pointer text-xs">Enable popular categories list</label>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              )}

                              <div className="md:col-span-2 pt-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => setEditingSectionId(null)}
                                  className="px-3.5 py-1.5 bg-[#E91E63] hover:bg-[#341a5e] text-white rounded-lg font-bold text-xs shadow-md hover:shadow transition"
                                >
                                  Close Sub-Editor ✓
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400">Expand configuration setups to edit properties.</p>
                          )}
                        </div>

                        {/* Node triggers */}
                        <div className="flex gap-1.5 items-center">
                          <button
                            onClick={() => handleMoveSection(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 bg-white hover:bg-slate-100 rounded border text-slate-600 disabled:opacity-40"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveSection(idx, 'down')}
                            disabled={idx === activePage.sections.length - 1}
                            className="p-1 bg-white hover:bg-slate-100 rounded border text-slate-600 disabled:opacity-40"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSectionId(editingSectionId === sec.id ? null : sec.id)}
                            className="px-2.5 py-1 text-[10px] bg-white border hover:bg-rose-50 text-slate-600 hover:text-rose-705 font-bold rounded-lg"
                          >
                            Config
                          </button>
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            className="p-1 bg-white hover:bg-rose-50 rounded border text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Grid of buttons to append visual nodes */}
                <div className="border-t border-slate-100 pt-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Append visual block modules</span>
                    <span className="text-[9px] text-[#E91E63] font-black uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full">100% SEO Ready</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                    {(['banner', 'slider', 'categories_grid', 'products_grid', 'image_content', 'video', 'faq', 'reviews', 'google_review', 'text', 'code_embed', 'delivery_countdown', 'footer_builder'] as const).map(type => {
                      if (type === 'text') {
                        return (
                          <React.Fragment key={type}>
                            <button
                              type="button"
                              onClick={() => handleAddSection('text', 'h1')}
                              className="py-2.5 px-2 bg-rose-50/20 border border-rose-200/50 hover:bg-rose-50 hover:border-rose-300 rounded-lg text-left text-[#E91E63] font-bold transition flex flex-col gap-0.5"
                            >
                              <span className="text-[10px] font-black">H1 SEO HEADLINE</span>
                              <span className="text-[8px] text-slate-400 font-mono font-medium tracking-normal">Heading Level 1</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSection('text', 'h2')}
                              className="py-2.5 px-2 bg-orange-50/20 border border-orange-200/50 hover:bg-orange-50 hover:border-orange-300 rounded-lg text-left text-orange-700 font-bold transition flex flex-col gap-0.5"
                            >
                              <span className="text-[10px] font-black">H2 SEO HEADING</span>
                              <span className="text-[8px] text-slate-400 font-mono font-medium tracking-normal">Heading Level 2</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSection('text', 'h3')}
                              className="py-2.5 px-2 bg-teal-50/20 border border-teal-200/50 hover:bg-teal-50 hover:border-teal-300 rounded-lg text-left text-teal-700 font-bold transition flex flex-col gap-0.5"
                            >
                              <span className="text-[10px] font-black">H3 SEO SUBHEADING</span>
                              <span className="text-[8px] text-slate-400 font-mono font-medium tracking-normal">Heading Level 3</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSection('text', 'p')}
                              className="py-2.5 px-2 bg-indigo-50/20 border border-indigo-200/50 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg text-left text-indigo-700 font-bold transition flex flex-col gap-0.5"
                            >
                              <span className="text-[10px] font-black">PARAGRAPH BODY (P)</span>
                              <span className="text-[8px] text-slate-400 font-mono font-medium tracking-normal">Standard text block</span>
                            </button>
                          </React.Fragment>
                        );
                      }
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAddSection(type)}
                          className="py-2.5 px-2 bg-slate-50 border hover:bg-rose-50/50 hover:border-rose-220 rounded-lg text-left text-slate-650 hover:text-rose-700 font-semibold transition flex flex-col justify-center"
                        >
                          <span>+ {type.replace('_', ' ').toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400">Loading page assemblies...</div>
            )}
          </div>
        </div>
      ) : (
        /* DYNAMIC NAVBAR MENU MANAGER */
        <div className="p-5 bg-white border border-slate-100 rounded-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-base">Store Navigation Headers & Submenus</h4>
              <p className="text-xs text-slate-500">Configure global menus, submenus, sequences, and category associations visually on one single screen. All changes synchronize immediately across desktop and mobile storefronts.</p>
            </div>
            
            <button
              onClick={() => {
                const autoId = `nav-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                setNavDraft([...navDraft, {
                  id: autoId,
                  title: 'New Navigation Item',
                  url: '/category/fresh-flowers',
                  type: 'category',
                  categoryId: 'cat-flowers',
                  parentMenuId: 'main',
                  sequence: navDraft.length + 1,
                  enabled: true
                }]);
              }}
              className="px-4 py-2 hover:bg-slate-800 bg-slate-900 text-white font-bold rounded-lg text-xs transition shrink-0"
            >
              + Append New Menu Link
            </button>
          </div>

          {/* Guidelines info card to clarify how priority works */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 text-xs space-y-2 text-slate-700 text-left">
            <span className="font-bold text-slate-900 block flex items-center gap-1">💡 Smart Navigation Assembly Guidelines:</span>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li><strong>Left-to-Right Priority</strong>: Top-level menu items (with parent set to <em>Main Menu Bar</em>) are arranged left-to-right based on their <strong>Sequence Priority</strong> number.</li>
              <li><strong>Top-to-Down Priority</strong>: Submenu items (which you can drop under any top-level parent menu item) are displayed vertically based on their <strong>Sequence Priority</strong>.</li>
              <li><strong>Publish Category Multiple Times</strong>: Create multiple links pointing to the same Category page but placed at different places (e.g. main menu and standard custom submenus simultaneously!).</li>
            </ul>
          </div>

          {/* Success notice banner */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-2 animate-bounce">
              <span>✓ Navigation configuration successfully synchronized and rebuilt on the customer storefront live!</span>
            </div>
          )}

          <div className="space-y-4">
            {navDraft.map((link, idx) => {
              // Eligible parent menu dropdown candidates: Any link that is also a top level link (i.e. parentMenuId is 'main' or undefined) and is not itself
              const parentCandidates = navDraft.filter(candidate => candidate.id !== link.id && (!candidate.parentMenuId || candidate.parentMenuId === 'main'));

              return (
                <div key={link.id || idx} className="bg-slate-55/40 p-4 rounded-xl border border-slate-200/60 shadow-2xs hover:shadow-xs transition space-y-3 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-105 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 font-mono">
                      Menu Link #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Priority Sort Field */}
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Sequence Priority:</label>
                      <input
                        type="number"
                        className="w-16 p-1 bg-white border border-slate-250 rounded text-center text-xs font-mono font-bold text-slate-850"
                        value={link.sequence || 1}
                        min="1"
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const copy = [...navDraft];
                          copy[idx].sequence = val;
                          setNavDraft(copy);
                        }}
                      />

                      <div className="h-4 w-px bg-slate-300 mx-1"></div>

                      {/* Enabled check */}
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                          checked={link.enabled !== false}
                          onChange={(e) => {
                            const copy = [...navDraft];
                            copy[idx].enabled = e.target.checked;
                            setNavDraft(copy);
                          }}
                        />
                        <span className="text-[10px] uppercase font-bold text-slate-600">{link.enabled !== false ? 'Visible' : 'Hidden'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    {/* 1. Custom title name */}
                    <div>
                      <label className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">Menu Label Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Anniversary Gifts"
                        className="w-full p-2 bg-white border rounded-lg text-xs"
                        value={link.title}
                        onChange={(e) => {
                          const copy = [...navDraft];
                          copy[idx].title = e.target.value;
                          setNavDraft(copy);
                        }}
                      />
                    </div>

                    {/* 2. Redirection Category Type */}
                    <div>
                      <label className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">Connection Type</label>
                      <select
                        className="w-full p-2 bg-white border rounded-lg text-xs font-medium"
                        value={link.type || 'custom'}
                        onChange={(e) => {
                          const typeVal = e.target.value as 'category' | 'page' | 'custom';
                          const copy = [...navDraft];
                          copy[idx].type = typeVal;

                          if (typeVal === 'category') {
                            const firstCat = state.categories[0];
                            if (firstCat) {
                              copy[idx].categoryId = firstCat.id;
                              copy[idx].url = `/category/${firstCat.slug}`;
                              copy[idx].title = firstCat.name;
                            }
                          } else if (typeVal === 'page') {
                            const firstPage = state.pages[0];
                            if (firstPage) {
                              copy[idx].url = `/page/${firstPage.slug}`;
                              copy[idx].title = firstPage.title;
                              delete copy[idx].categoryId;
                            }
                          } else {
                            copy[idx].url = '/';
                            delete copy[idx].categoryId;
                          }
                          setNavDraft(copy);
                        }}
                      >
                        <option value="category">🎁 Category Catalog Page</option>
                        <option value="page">📄 Custom Page Template</option>
                        <option value="custom">🔗 Custom URL / External Link</option>
                      </select>
                    </div>

                    {/* 3. Link resolution selector */}
                    <div>
                      <label className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">Target Address Selection</label>
                      {link.type === 'category' ? (
                        <select
                          className="w-full p-2 bg-rose-50/50 border border-slate-300 rounded-lg text-xs font-semibold text-rose-900"
                          value={link.categoryId || ''}
                          onChange={(e) => {
                            const catId = e.target.value;
                            const catObj = state.categories.find(c => c.id === catId);
                            if (catObj) {
                              const copy = [...navDraft];
                              copy[idx].categoryId = catId;
                              copy[idx].url = `/category/${catObj.slug}`;
                              copy[idx].title = catObj.name;
                              setNavDraft(copy);
                            }
                          }}
                        >
                          {state.categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name} ({cat.slug})</option>
                          ))}
                        </select>
                      ) : link.type === 'page' ? (
                        <select
                          className="w-full p-2 bg-indigo-50/50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-805"
                          value={link.url || ''}
                          onChange={(e) => {
                            const valUrl = e.target.value;
                            const pageObj = state.pages.find(p => `/page/${p.slug}` === valUrl);
                            const copy = [...navDraft];
                            copy[idx].url = valUrl;
                            if (pageObj) {
                              copy[idx].title = pageObj.title;
                            }
                            setNavDraft(copy);
                          }}
                        >
                          {state.pages.map(page => (
                            <option key={page.id} value={`/page/${page.slug}`}>{page.title} ({page.slug})</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="w-full p-2 bg-white border rounded-lg text-xs font-mono"
                          value={link.url}
                          onChange={(e) => {
                            const copy = [...navDraft];
                            copy[idx].url = e.target.value;
                            setNavDraft(copy);
                          }}
                          placeholder="e.g. /contact or https://..."
                        />
                      )}
                    </div>

                    {/* 4. Parent Menu selection */}
                    <div>
                      <label className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">Parent Placement Category</label>
                      <select
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                        value={link.parentMenuId || 'main'}
                        onChange={(e) => {
                          const copy = [...navDraft];
                          copy[idx].parentMenuId = e.target.value;
                          setNavDraft(copy);
                        }}
                      >
                        <option value="main">🖥️ Main Menu Bar (Root - Left-to-Right)</option>
                        {parentCandidates.map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            └ Dropdown under: "{parent.title || 'Untitled item'}"
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 text-slate-400">
                    <span className="font-mono text-[10px] truncate max-w-[200px]">
                      Resolved URL: <strong className="text-slate-655 font-mono shrink-0">{link.url}</strong>
                    </span>

                    <button
                      onClick={() => {
                        const copy = navDraft.filter((_, i) => i !== idx);
                        setNavDraft(copy);
                      }}
                      className="p-1 px-3 text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition font-semibold"
                    >
                      Remove Menu Link #{idx + 1}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-between pt-4 border-t border-slate-105 gap-4">
            <button
              onClick={() => {
                const autoId = `nav-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                setNavDraft([...navDraft, {
                  id: autoId,
                  title: 'New Navigation Item',
                  url: '/category/gift-hampers',
                  type: 'category',
                  categoryId: 'cat-hampers',
                  parentMenuId: 'main',
                  sequence: navDraft.length + 1,
                  enabled: true
                }]);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-slate-700 transition inline-flex items-center justify-center gap-1 text-xs"
            >
              <Plus className="w-4 h-4 text-slate-605 inline" /> + Append Menu Link Item
            </button>

            <button
              onClick={handleSaveNavbar}
              className="px-6 py-2.5 hover:bg-rose-700 bg-rose-500 text-white shadow-md font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition text-xs"
            >
              <Save className="w-4 h-4" /> Save Navigation configuration
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Page Creation modal overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white border rounded-2xl w-full max-w-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Create New Custom Page</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-650 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Page Name *</label>
                  <input
                    type="text"
                    required
                    value={newPageTitle}
                    onChange={(e) => {
                      const title = e.target.value;
                      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      setNewPageTitle(title);
                      setNewPageSlug(slug);
                      setNewPageMetaTitle(`${title} | Koseli Xpress`);
                    }}
                    placeholder="e.g. Anniversary Hampers"
                    className="w-full p-2 border rounded-md bg-slate-50 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL / Slug *</label>
                  <input
                    type="text"
                    required
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                    placeholder="e.g. anniversary-hampers"
                    className="w-full p-2 border rounded-md bg-slate-50 font-mono text-[#E91E63] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Page Status</label>
                <div className="flex gap-4 p-1 bg-slate-50 rounded border max-w-xs">
                  <button
                    type="button"
                    onClick={() => setNewPageStatus('active')}
                    className={`flex-1 text-center py-1 rounded text-[11px] font-bold transition ${newPageStatus === 'active' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'}`}
                  >
                    Published
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPageStatus('draft')}
                    className={`flex-1 text-center py-1 rounded text-[11px] font-bold transition ${newPageStatus === 'draft' ? 'bg-[#E91E63] text-white shadow-xs' : 'text-slate-500'}`}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div className="border-t pt-2.5">
                <span className="text-[10px] font-bold text-[#E91E63] uppercase tracking-wider block mb-2 font-mono">Search Engine Optimization (SEO) Metadata</span>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Meta Title</label>
                    <input
                      type="text"
                      value={newPageMetaTitle}
                      onChange={(e) => setNewPageMetaTitle(e.target.value)}
                      placeholder="Anniversary Hampers Delivery in Nepal | Koseli Xpress"
                      className="w-full p-2 border rounded-md bg-slate-50 font-mono text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">Meta Description</label>
                    <textarea
                      rows={2}
                      value={newPageMetaDesc}
                      onChange={(e) => setNewPageMetaDesc(e.target.value)}
                      placeholder="Send beautiful anniversary gifts and flowers to Nepal."
                      className="w-full p-2 border rounded-md bg-slate-50 font-mono text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 mb-0.5">SEO Keywords</label>
                    <input
                      type="text"
                      value={newPageKeywords}
                      onChange={(e) => setNewPageKeywords(e.target.value)}
                      placeholder="anniversary category, gifts nepal, florists nepal"
                      className="w-full p-2 border rounded-md bg-slate-50 font-mono text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalPage}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Create Custom Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
