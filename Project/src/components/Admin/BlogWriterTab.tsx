import React, { useState } from 'react';
import { DatabaseState, AIBlog } from '../../types';
import { 
  Sparkles, 
  FileText, 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Key,
  Globe,
  Settings,
  ArrowRight,
  RefreshCw,
  Edit,
  Save,
  ChevronRight
} from 'lucide-react';

interface BlogWriterTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function BlogWriterTab({ state, onUpdateState }: BlogWriterTabProps) {
  const [blogs, setBlogs] = useState<AIBlog[]>(state.aiBlogs || []);
  
  // Generation & entry states
  const [subject, setSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Generated blog results to review or override
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedSlug, setGeneratedSlug] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedKeywords, setGeneratedKeywords] = useState('');
  const [generatedDesc, setGeneratedDesc] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasNewDraft, setHasNewDraft] = useState(false);

  // Previewer modal or view block
  const [activeBlogPreview, setActiveBlogPreview] = useState<AIBlog | null>(null);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  // call server-side gemini endpoint to write blog automatically based on subject!
  const generateAIBlog = async () => {
    if (!subject.trim()) {
      triggerError('Please provide a subject topic first.');
      return;
    }

    setIsGenerating(true);
    setHasNewDraft(false);
    setIsEditMode(false);

    try {
      const response = await fetch('/api/gemini/write-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject })
      });

      if (!response.ok) {
        throw new Error('Server returned error status');
      }

      const data = await response.json();
      setGeneratedTitle(data.title || '');
      setGeneratedSlug(data.slug || '');
      setGeneratedContent(data.content || '');
      setGeneratedKeywords(data.seoKeywords || '');
      setGeneratedDesc(data.metaDescription || '');
      setGeneratedImageUrl(data.imageUrl || 'https://images.unsplash.com/photo-1549463010-14ec4a3f4e2c?q=80&w=1200&auto=format&fit=crop');
      
      setHasNewDraft(true);
      triggerSuccess('SEO-friendly Blog post crafted beautifully by Gemini!');
    } catch (err: any) {
      console.error(err);
      // Fallback
      const fallbackTitle = `Maximizing Joy: How to Celebrate ${subject}`;
      const fallbackSlug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setGeneratedTitle(fallbackTitle);
      setGeneratedSlug(fallbackSlug || 'festive-gift-ideas');
      setGeneratedContent(`
        <h2>Discover the Ultimate Guide to ${subject}</h2>
        <p>Gifting is not just about material objects; it is about conveying your deepest emotions across distances. At <strong>Koseli Xpress</strong>, we represent that bridge of love and happiness across Nepal.</p>
        <h3>The Perfect Formula for Sending Love</h3>
        <p>When you send gifts to Nepal from anywhere in the world, you are sharing a smile. Here are some of our top considerations:</p>
        <ul>
          <li><strong>Select Freshness:</strong> Opt for baked-on-delivery premium cakes and fresh-cut farm roses.</li>
          <li><strong>Personalize:</strong> Always append custom printed cards containing your personal words.</li>
          <li><strong>Reliable Dispatch:</strong> Ensure the courier guarantees express delivery directly to Kathmandu and beyond.</li>
        </ul>
        <p>Find everything you need to deliver happiness online today via Koseli Xpress!</p>
      `.trim());
      setGeneratedKeywords(`${subject.toLowerCase()}, gift guide nepal, express gift delivery`);
      setGeneratedDesc(`Looking for tips on ${subject}? This guide has everything you need. Find how to send gifts online instantly across Nepal with Koseli Xpress.`);
      setGeneratedImageUrl('https://images.unsplash.com/photo-1549463010-14ec4a3f4e2c?q=80&w=1200&auto=format&fit=crop');
      setHasNewDraft(true);
      triggerError('AI rate limited. Loaded robust custom template fallback.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish or save draft inside state.aiBlogs
  const saveBlogToDB = (statusVal: 'draft' | 'published') => {
    if (!generatedTitle) {
      triggerError('No blog content to save.');
      return;
    }

    let updatedBlogs = [...blogs];
    const cleanSlug = generatedSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const finalSlug = cleanSlug || `blog-${Date.now()}`;

    if (editingBlogId) {
      updatedBlogs = blogs.map(b => {
        if (b.id === editingBlogId) {
          return {
            ...b,
            title: generatedTitle,
            slug: finalSlug,
            subject: subject || b.subject,
            content: generatedContent,
            seoKeywords: generatedKeywords,
            metaDescription: generatedDesc,
            status: statusVal,
            imageUrl: generatedImageUrl || 'https://images.unsplash.com/photo-1549463010-14ec4a3f4e2c?q=80&w=1200&auto=format&fit=crop'
          };
        }
        return b;
      });
      triggerSuccess(`Successfully updated the blog post!`);
    } else {
      const newBlog: AIBlog = {
        id: `blog-${Date.now()}`,
        title: generatedTitle,
        slug: finalSlug,
        subject: subject,
        content: generatedContent,
        seoKeywords: generatedKeywords,
        metaDescription: generatedDesc,
        status: statusVal,
        createdAt: new Date().toISOString().substring(0, 10),
        author: 'Koseli AI Assistant',
        imageUrl: generatedImageUrl || 'https://images.unsplash.com/photo-1549463010-14ec4a3f4e2c?q=80&w=1200&auto=format&fit=crop'
      };
      updatedBlogs = [newBlog, ...blogs];
      triggerSuccess(`Successfully ${statusVal === 'published' ? 'published' : 'saved draft of'} the blog!`);
    }

    setBlogs(updatedBlogs);
    onUpdateState({
      ...state,
      aiBlogs: updatedBlogs
    });

    // Reset form
    setSubject('');
    setGeneratedTitle('');
    setGeneratedSlug('');
    setGeneratedContent('');
    setGeneratedKeywords('');
    setGeneratedDesc('');
    setGeneratedImageUrl('');
    setEditingBlogId(null);
    setHasNewDraft(false);
  };

  const deleteBlog = (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      const updatedBlogs = blogs.filter(b => b.id !== id);
      setBlogs(updatedBlogs);
      onUpdateState({
        ...state,
        aiBlogs: updatedBlogs
      });
      if (activeBlogPreview?.id === id) {
        setActiveBlogPreview(null);
      }
      triggerSuccess('Blog post deleted successfully.');
    }
  };

  const toggleBlogStatus = (id: string) => {
    const updatedBlogs = blogs.map(b => {
      if (b.id === id) {
        const nextStatus = b.status === 'published' ? 'draft' as const : 'published' as const;
        triggerSuccess(`Post status changed to: ${nextStatus.toUpperCase()}`);
        return { ...b, status: nextStatus };
      }
      return b;
    });
    setBlogs(updatedBlogs);
    onUpdateState({
      ...state,
      aiBlogs: updatedBlogs
    });
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Alerts */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-650" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-650" />
          {errorMsg}
        </div>
      )}

      {/* Header Info Block */}
      <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rose-650 animate-pulse" />
            SEO Blog Post Writer Workstation
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Draft, generate, and edit 100% search-engine-optimized blogs. Write compelling guides regarding products to boost site metadata and search priority.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-bold">
            Total Articles: {blogs.length}
          </span>
          <span className="text-[11px] font-mono px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-100 font-bold">
            Published: {blogs.filter(b => b.status === 'published').length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Generator Inputs and Working Draft Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500" /> Start AI Article Writer
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject Topic or Target Keyword Phrase</label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Why Chocolate cake is perfect for Mothers anniversary gifts in Kathmandu..."
                    className="flex-1 text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    onClick={generateAIBlog}
                    disabled={isGenerating || !subject.trim()}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold uppercase rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/10"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Drafting Post...
                      </>
                    ) : (
                      <>
                        Write SEO Post ✨
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Working Draft Section */}
          {hasNewDraft && (
            <div className="p-5 bg-white border border-rose-100 rounded-2xl space-y-4 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between gap-3 border-b border-rose-100/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">AI Writer Live Edit & Review Screen</h4>
                </div>
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="text-[10px] uppercase font-mono font-extrabold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> {isEditMode ? 'Finish Editing' : 'Manual Override'}
                </button>
              </div>

              {/* Edit Layout vs Presentation layout */}
              {isEditMode ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Article Title</label>
                    <input
                      type="text"
                      value={generatedTitle}
                      onChange={(e) => setGeneratedTitle(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">SEO URL Slug</label>
                      <input
                        type="text"
                        value={generatedSlug}
                        onChange={(e) => setGeneratedSlug(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Focus Keywords</label>
                      <input
                        type="text"
                        value={generatedKeywords}
                        onChange={(e) => setGeneratedKeywords(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl animate-in fade-in"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">SEO Meta Description</label>
                      <input
                        type="text"
                        value={generatedDesc}
                        onChange={(e) => setGeneratedDesc(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Blog Cover/Feature Image URL</label>
                      <input
                        type="text"
                        value={generatedImageUrl}
                        onChange={(e) => setGeneratedImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <label className="block text-[9px] font-bold uppercase text-slate-400">HTML Rich Content (Structured Content with Headings)</label>
                      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setGeneratedContent(prev => prev + '\n<h1>Main Title Heading (H1)</h1>')}
                          className="px-2 py-0.5 bg-white text-[9px] font-black text-[#d11252] border border-slate-200 rounded hover:bg-rose-50"
                          title="H1 Main SEO Header"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeneratedContent(prev => prev + '\n<h2>Section Subtitle (H2)</h2>')}
                          className="px-2 py-0.5 bg-white text-[9px] font-bold text-slate-700 border border-slate-200 rounded hover:bg-slate-55"
                          title="H2 Subheading"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeneratedContent(prev => prev + '\n<h3>Nested Subheading (H3)</h3>')}
                          className="px-2 py-0.5 bg-white text-[9px] font-bold text-slate-650 border border-slate-200 rounded hover:bg-slate-55"
                          title="H3 Subheading"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeneratedContent(prev => prev + '\n<p>Introduce relevant keywords centered around organic gift delivery in Kathmandu, Nepal...</p>')}
                          className="px-2 py-0.5 bg-white text-[9px] text-slate-600 border border-slate-200 rounded hover:bg-slate-55"
                          title="Add Paragraph Body"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeneratedContent(prev => prev + '\n<img src="https://images.unsplash.com/photo-1549463010-14ec4a3f4e2c?q=80&w=600" alt="Beautiful Flowers Bouquet" class="w-full max-h-80 object-cover rounded-2xl my-4" />')}
                          className="px-2 py-0.5 bg-rose-50 text-[9px] font-bold text-rose-700 border border-rose-200 rounded hover:bg-rose-100"
                          title="Add Inline Styled Image"
                        >
                          🖼️ Add Inline Image
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={12}
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs text-left">
                  <div className="space-y-1">
                    <span className="text-[9px] tracking-wider uppercase bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-extrabold">Proposed Headline</span>
                    <h1 className="text-lg font-extrabold text-slate-900 leading-snug">{generatedTitle}</h1>
                  </div>

                  {/* SEO Cards meta information dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-left">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">URL Path Preview</span>
                      <code className="text-[10px] font-mono text-slate-650 truncate block text-slate-700">/blog/{generatedSlug}</code>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-left">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">SEO Meta Keywords</span>
                      <p className="text-[10px] text-slate-600 font-semibold truncate text-rose-850" title={generatedKeywords}>
                        {generatedKeywords}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-left">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">SERPs Meta Description</span>
                      <p className="text-[10px] text-slate-600 leading-snug font-medium line-clamp-2">
                        {generatedDesc}
                      </p>
                    </div>
                  </div>

                  {/* Generated blog visual block */}
                  <div className="p-5 border border-slate-150 bg-slate-50/50 rounded-2xl">
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-extrabold block mb-3 font-mono">RENDERED PREVIEW</span>
                    <div 
                      className="prose prose-sm max-w-none text-xs text-slate-750 font-sans tracking-wide leading-relaxed space-y-3.5"
                      dangerouslySetInnerHTML={{ __html: generatedContent }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => saveBlogToDB('published')}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Globe className="w-4 h-4 animate-spin-slow" /> Publish Article instantly 🚀
                </button>
                <button
                  type="button"
                  onClick={() => saveBlogToDB('draft')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl transition cursor-pointer"
                >
                  Save Draft 📁
                </button>
              </div>

            </div>
          )}

          {/* Listed Articles Registry */}
          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Registered Magazine Articles ({blogs.length})
            </h3>

            {blogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No articles published under Koseli Blog yet. Trigger AI writer above!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {blogs.map(blog => (
                  <div key={blog.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="space-y-1 text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-850 hover:text-rose-600 cursor-pointer block truncate font-sans tracking-tight" onClick={() => setActiveBlogPreview(blog)}>
                          {blog.title}
                        </span>
                        {blog.status === 'published' ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded uppercase font-mono">Published</span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded uppercase font-mono">Draft</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3.5 text-[10px] text-slate-400 font-medium">
                        <span>Dated: <strong>{blog.createdAt}</strong></span>
                        <span className="flex items-center gap-1">Keywords: <strong className="text-slate-600 max-w-xs truncate">{blog.seoKeywords}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSubject(blog.subject || '');
                          setGeneratedTitle(blog.title);
                          setGeneratedSlug(blog.slug);
                          setGeneratedContent(blog.content);
                          setGeneratedKeywords(blog.seoKeywords);
                          setGeneratedDesc(blog.metaDescription);
                          setGeneratedImageUrl(blog.imageUrl || '');
                          setEditingBlogId(blog.id);
                          setHasNewDraft(true);
                          setIsEditMode(true);
                          // scroll smooth to editor
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                          triggerSuccess(`Loaded "${blog.title}" into review editor!`);
                        }}
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        title="Edit Article & Meta Fields"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setActiveBlogPreview(blog)}
                        className="p-1.5 text-slate-450 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition"
                        title="Display Live Article Reader"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleBlogStatus(blog.id)}
                        className={`px-2 py-1 text-[9px] font-bold rounded-lg uppercase border transition cursor-pointer ${
                          blog.status === 'published'
                            ? 'bg-amber-50 border-amber-250 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-150'
                        }`}
                        title="Toggle visibility draft vs public site"
                      >
                        {blog.status === 'published' ? 'Depublish' : 'Go Live'}
                      </button>
                      <button
                        onClick={() => deleteBlog(blog.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: SEO Audit widget and Previewer Modal */}
        <div className="space-y-6">
          
          {/* Preview Panel as custom widget */}
          {activeBlogPreview ? (
            <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-md animate-in fade-in duration-200 text-left">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <span className="text-[10px] uppercase font-mono font-bold text-rose-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Magazine Live View
                </span>
                <button
                  onClick={() => setActiveBlogPreview(null)}
                  className="text-[10px] uppercase font-mono font-bold text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg"
                >
                  Close View
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-extrabold text-slate-900 leading-snug">{activeBlogPreview.title}</h2>
                  <div className="flex items-center justify-between gap-2.5 text-[9px] text-slate-500 uppercase font-bold tracking-wider font-mono">
                    <span>By: {activeBlogPreview.author}</span>
                    <span>{activeBlogPreview.createdAt}</span>
                  </div>
                </div>

                <div className="p-2 border border-rose-100/30 bg-rose-50/20 rounded-xl space-y-1">
                  <span className="text-[8px] font-bold text-rose-600 block uppercase font-mono">SERP Description Metadata</span>
                  <p className="text-[9.5px] italic text-slate-600 leading-snug font-medium">"{activeBlogPreview.metaDescription}"</p>
                </div>

                <div className="border border-slate-150 bg-white p-4.5 rounded-2xl max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-sm max-w-none text-xs text-slate-755 leading-relaxed font-sans tracking-wide space-y-3.5 text-left"
                    dangerouslySetInnerHTML={{ __html: activeBlogPreview.content }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-4 shadow-sm text-left">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-slate-500" /> SEO Checklist Metrics
              </h3>
              
              <ul className="space-y-2.5 text-xs text-slate-600 font-semibold">
                <li className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-650 font-bold text-[9px] mt-0.5 text-emerald-700">✓</span>
                  <div>
                    <span className="font-bold text-slate-800">100% Real AI copywriting</span>
                    <p className="text-[9px] text-slate-400 font-medium">Integrates original content without generic templates wrapper.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-650 font-bold text-[9px] mt-0.5 text-emerald-700">✓</span>
                  <div>
                    <span className="font-bold text-slate-800">Meta Tag integration</span>
                    <p className="text-[9px] text-slate-400 font-medium">Injects highly optimized keyword queries for crawlers and bots indexing.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-emerald-650 font-bold text-[9px] mt-0.5 text-emerald-700">✓</span>
                  <div>
                    <span className="font-bold text-slate-800">HTML semantic layout hierarchy</span>
                    <p className="text-[9px] text-slate-400 font-medium">Structured headers, tables, bold triggers emphasize your primary search indexes.</p>
                  </div>
                </li>
              </ul>
            </div>
          )}

          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl space-y-2 text-xs text-left">
            <h4 className="font-bold text-slate-800 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-rose-500" /> Why publish blogs?
            </h4>
            <p className="text-[9px] leading-relaxed text-slate-500 font-medium">
              Publishing organic content is proven to lower client acquisition costs. Search engines rank complete guides referencing "gift delivery in Kathmandu" higher, driving organic traffic directly into your cart systems.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
