import React, { useMemo } from 'react';
import { DatabaseState, AIBlog } from '../../types';
import { BookOpen, Calendar, ArrowLeft, User, Eye, Sparkles, Share2, Facebook, Twitter, Link } from 'lucide-react';

interface BlogViewerProps {
  currentSlug: string;
  state: DatabaseState;
  onNavigateToSlug: (slug: string) => void;
  primaryColor?: string;
}

export default function BlogViewer({ currentSlug, state, onNavigateToSlug, primaryColor = '#E91E63' }: BlogViewerProps) {
  const blogs = useMemo(() => {
    return (state.aiBlogs || []).filter(b => b.status === 'published');
  }, [state.aiBlogs]);

  // Determine if viewing a specific blog
  const activeBlog = useMemo(() => {
    if (currentSlug === 'blog') return null;
    
    // Extract slug from e.g. "blog/some-slug" or "blog-some-slug"
    let targetSlug = currentSlug.replace('blog/', '').replace('blog-', '');
    return blogs.find(b => b.slug === targetSlug || b.id === targetSlug);
  }, [currentSlug, blogs]);

  const handleShare = (platform: string, blogTitle: string) => {
    const url = window.location.href;
    let shareUrl = '';
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(blogTitle)}`;
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      return;
    }
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // Render Indivudual Blog Post
  if (activeBlog) {
    // Exclude current blog for "Related features"
    const relatedBlogs = blogs.filter(b => b.id !== activeBlog.id).slice(0, 3);
    
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-8 animate-in fade-in duration-300">
        
        {/* Navigation Breadcrumb */}
        <div className="text-left">
          <button
            onClick={() => onNavigateToSlug('blog')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog Directory
          </button>
        </div>

        {/* Article Container Card */}
        <article className="bg-[#0f0f11]/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-rose-950/5">
          
          {/* Article Banner Image */}
          {activeBlog.imageUrl && (
            <div className="w-full h-64 sm:h-80 overflow-hidden relative border-b border-white/10">
              <img 
                src={activeBlog.imageUrl} 
                alt={activeBlog.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11] via-transparent to-transparent opacity-60"></div>
            </div>
          )}

          {/* Header Area */}
          <div className="p-6 sm:p-10 border-b border-white/5 space-y-4 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#a78bfa] font-extrabold px-2.5 py-1 bg-[#a78bfa]/10 rounded-lg">
                Koseli Editorial Guild
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> {activeBlog.createdAt}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-serif italic text-white leading-tight font-extrabold">
              {activeBlog.title}
            </h1>

            {/* Author info & social actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-8 h-8 rounded-full bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-450 text-xs font-bold font-mono">
                  AI
                </div>
                <div>
                  <span className="font-bold block text-slate-200">{activeBlog.author || 'Koseli AI Assistant'}</span>
                  <span className="text-[10px] text-slate-500">Professional Copywriter</span>
                </div>
              </div>

              {/* Share icons */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-450 font-semibold mr-1.5 flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5" /> Share Article:
                </span>
                <button
                  onClick={() => handleShare('facebook', activeBlog.title)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-350 hover:text-white transition"
                  title="Share on Facebook"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShare('twitter', activeBlog.title)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-350 hover:text-white transition"
                  title="Share on Twitter"
                >
                  <Twitter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShare('copy', activeBlog.title)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-350 hover:text-white transition"
                  title="Copy Page Link"
                >
                  <Link className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6 text-left">
            {/* SERPs Meta description highlight box */}
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
              <span className="text-[9px] uppercase tracking-wider text-rose-500 font-extrabold font-mono block mb-1">
                SUMMARY DESCRIPTION (SEO)
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                "{activeBlog.metaDescription}"
              </p>
            </div>

            {/* Main HTML Rich Content Block */}
            <div 
              className="prose prose-invert prose-rose max-w-none text-sm text-slate-300 font-sans tracking-wide leading-relaxed space-y-4 pt-2"
              dangerouslySetInnerHTML={{ __html: activeBlog.content }}
            />
          </div>

          {/* Keywords footer tag block */}
          {activeBlog.seoKeywords && (
            <div className="p-6 border-t border-white/5 text-left flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-450 mr-2 flex items-center gap-1 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-spin-slow" /> Tags:
              </span>
              {activeBlog.seoKeywords.split(',').map((tag, idx) => (
                <span 
                  key={idx} 
                  className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}

        </article>

        {/* Read More Section */}
        {relatedBlogs.length > 0 && (
          <div className="space-y-4 text-left pt-6">
            <h3 className="text-lg font-serif italic text-white tracking-wide border-b border-white/5 pb-2">
              Keep Reading Gifting Insights
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBlogs.map(item => (
                <div 
                  key={item.id}
                  onClick={() => onNavigateToSlug(`blog/${item.slug}`)}
                  className="bg-[#0f0f11]/80 border border-white/10 hover:border-rose-500/25 p-5 rounded-2xl space-y-3 cursor-pointer transition duration-300"
                >
                  <span className="text-[9px] font-mono text-pink-400 block font-bold">{item.createdAt}</span>
                  <h4 className="text-sm font-bold text-slate-100 hover:text-rose-450 line-clamp-2 transition leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold line-clamp-2">
                    {item.metaDescription}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    );
  }

  // Render directory list (All published blogs)
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Banner Jumbotron */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0f0f11]/65 border border-white/10 p-8 sm:p-12 text-left shadow-xl shadow-rose-950/5">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BookOpen className="w-48 h-48 text-[#a78bfa]" />
        </div>

        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#a78bfa]/10 rounded-lg text-[#a78bfa] text-[10px] font-bold uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 animate-bounce" /> Koseli Editorial Columns
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif italic text-white leading-normal font-extrabold tracking-wide">
            Spreading Joy Across Nepal: The Koseli Blog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-lg">
            Discover original anniversary guides, romantic gift hack templates, fresh floristry logs, and curated express cakes recipes published automatically for smart gifting.
          </p>
        </div>
      </div>

      {blogs.length === 0 ? (
        <div className="p-16 bg-[#0f0f11]/40 border border-white/5 rounded-3xl text-center space-y-4 max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-200">Editorial Section Preparing</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
              Our writer AI is currently compiling beautiful festive guides. Please check back shortly for published insights!
            </p>
          </div>
        </div>
      ) : (
        /* Blog grid listing */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {blogs.map(blog => {
            // Est estimated read time
            const words = blog.content ? blog.content.split(/\s+/).length : 50;
            const readTime = Math.max(1, Math.round(words / 200));

            return (
              <div 
                key={blog.id}
                onClick={() => onNavigateToSlug(`blog/${blog.slug}`)}
                className="group flex flex-col justify-between bg-[#0f0f11]/70 border border-white/10 hover:border-rose-500/30 rounded-2xl cursor-pointer transition duration-300 shadow-sm relative overflow-hidden"
              >
                {blog.imageUrl && (
                  <div className="w-full h-40 overflow-hidden relative">
                    <img 
                      src={blog.imageUrl} 
                      alt={blog.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f11]/60 to-transparent"></div>
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold font-mono">
                      <span className="flex items-center gap-1 uppercase">
                        <User className="w-3.5 h-3.5 text-slate-500" /> By {blog.author.split(' ')[0]}
                      </span>
                      <span>{readTime} Min Read</span>
                    </div>

                    <h3 className="text-base font-serif italic text-slate-100 group-hover:text-[#a78bfa] leading-snug transition-colors line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {blog.metaDescription}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5 text-[11px] font-bold">
                    <span className="font-mono text-slate-500">{blog.createdAt}</span>
                    <span className="text-rose-500 group-hover:translate-x-1 transition flex items-center gap-1">
                      Read Article &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
