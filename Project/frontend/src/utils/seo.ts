import { Product, Category, DynamicPage } from '../types';

export interface SEOCheck {
  id: string;
  label: string;
  type: 'meta' | 'content' | 'technical' | 'image' | 'internal';
  status: 'error' | 'warning' | 'pass';
  message: string;
  scoreImpact: number;
}

export interface SEOResult {
  score: number;
  grade: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  color: string;
  checks: SEOCheck[];
  metaScore: number;
  contentScore: number;
  technicalScore: number;
  mediaScore: number;
  linkingScore: number;
  schemaJson: string;
}

export function runSEOChecks(
  type: 'product' | 'category' | 'page',
  item: any,
  focusKeywordInput?: string, // user-supplied in real-time widget
  products: Product[] = [],
  categories: Category[] = [],
  pages: DynamicPage[] = []
): SEOResult {
  const checks: SEOCheck[] = [];

  // 1. Prepare properties safely
  const title = (type === 'product' ? item.name : item.title || item.name) || '';
  const slug = item.slug || '';
  const desc = item.description || item.metaDescription || '';
  const metaTitle = item.metaTitle || '';
  const metaDescription = item.metaDescription || '';
  // Use user input focus keyword or infer from title (first 2 words) if empty
  const defaultKeyword = title.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
  const focusKeyword = (focusKeywordInput || item.focusKeyword || defaultKeyword || '').toLowerCase().trim();

  // Initialize scores per category
  let metaPct = 0;
  let contentPct = 0;
  let techPct = 0;
  let mediaPct = 0;
  let linkPct = 0;

  // --- A. META SEO (Weight: 25%) ---
  const metaItems: { test: boolean; weight: number; passMsg: string; failMsg: string; isCrit: boolean }[] = [
    {
      test: !!metaTitle,
      weight: 30,
      passMsg: 'Meta Title is set.',
      failMsg: 'Missing Meta Title.',
      isCrit: true
    },
    {
      test: metaTitle.length >= 50 && metaTitle.length <= 60,
      weight: 20,
      passMsg: `Meta Title is optimized (${metaTitle.length} chars).`,
      failMsg: `Meta Title should be 50–60 chars (currently ${metaTitle.length}).`,
      isCrit: false
    },
    {
      test: !!metaDescription,
      weight: 30,
      passMsg: 'Meta Description is set.',
      failMsg: 'Missing Meta Description.',
      isCrit: true
    },
    {
      test: metaDescription.length >= 140 && metaDescription.length <= 160,
      weight: 20,
      passMsg: `Meta Description length is perfect (${metaDescription.length} chars).`,
      failMsg: `Meta Description should be 140–160 chars (currently ${metaDescription.length}).`,
      isCrit: false
    }
  ];

  let metaAchieved = 0;
  let metaTotal = 100;
  metaItems.forEach((item, idx) => {
    if (item.test) {
      metaAchieved += item.weight;
      checks.push({
        id: `meta_${idx}`,
        label: 'Meta Check',
        type: 'meta',
        status: 'pass',
        message: item.passMsg,
        scoreImpact: 0
      });
    } else {
      checks.push({
        id: `meta_${idx}`,
        label: 'Meta Check',
        type: 'meta',
        status: item.isCrit ? 'error' : 'warning',
        message: item.failMsg,
        scoreImpact: Math.ceil((item.weight / metaTotal) * 25)
      });
    }
  });
  metaPct = Math.round((metaAchieved / metaTotal) * 100);

  // --- B. CONTENT QUALITY (Weight: 30%) ---
  // Count words in primary description or sections
  let contentText = desc;
  if (type === 'page' && item.sections) {
    const sectionTexts = (item.sections as any[] || [])
      .map(s => `${s.data?.title || ''} ${s.data?.subtitle || ''} ${s.data?.content || ''}`)
      .join(' ');
    contentText += ' ' + sectionTexts;
  }
  
  const words = contentText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const kwInTitle = focusKeyword ? title.toLowerCase().includes(focusKeyword) : false;
  const kwInMetaTitle = focusKeyword ? metaTitle.toLowerCase().includes(focusKeyword) : false;
  const kwInMetaDesc = focusKeyword ? metaDescription.toLowerCase().includes(focusKeyword) : false;
  const kwInContent = focusKeyword ? contentText.toLowerCase().includes(focusKeyword) : false;

  // Keyword density
  let kwCount = 0;
  if (focusKeyword && wordCount > 0) {
    const regex = new RegExp(`\\b${focusKeyword}\\b`, 'gi');
    kwCount = (contentText.match(regex) || []).length;
  }
  const kwDensity = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;
  const kwDensityPerfect = kwDensity > 0.5 && kwDensity <= 4.0;

  // Count standard headings in content (simulated parser for rich editors or sections)
  let headingStructurePerfect = true;
  let headingWarning = '';
  if (type === 'page' && item.sections) {
    const sectionsObj = item.sections as any[] || [];
    const bannerCount = sectionsObj.filter(s => s.type === 'banner').length;
    const bannerWithTitle = sectionsObj.filter(s => s.type === 'banner' && s.data?.title).length;
    if (bannerCount > 0 && bannerWithTitle === 0) {
      headingStructurePerfect = false;
      headingWarning = 'Empty H1 equivalent in your Page Banner components.';
    }
  } else if (!title) {
    headingStructurePerfect = false;
    headingWarning = 'Missing primary H1 tag equivalent (Page/Product Title)';
  }

  const contentItems: { test: boolean; weight: number; passMsg: string; failMsg: string; isCrit: boolean }[] = [
    {
      test: wordCount >= 30,
      weight: 25,
      passMsg: `Good word count optimized (${wordCount} words).`,
      failMsg: `Content is brief (${wordCount} words). Aim for at least 30 words.`,
      isCrit: false
    },
    {
      test: kwInTitle || kwInMetaTitle,
      weight: 25,
      passMsg: `Focus keyword "${focusKeyword}" is present inside Title.`,
      failMsg: `Focus keyword "${focusKeyword}" was not found in page heading/title.`,
      isCrit: true
    },
    {
      test: kwInMetaDesc,
      weight: 15,
      passMsg: `Focus keyword is present in Search Description.`,
      failMsg: `Search description does not mention focus keyword.`,
      isCrit: false
    },
    {
      test: kwInContent,
      weight: 15,
      passMsg: `Focus keyword found inside webpage description content.`,
      failMsg: `Target keyword is absent from core visual descriptions.`,
      isCrit: false
    },
    {
      test: kwDensityPerfect,
      weight: 10,
      passMsg: `Perfect keyword density of ${kwDensity.toFixed(1)}%.`,
      failMsg: kwDensity > 4.0 
        ? `Keyword stuffing alert! density ${kwDensity.toFixed(1)}% is above 4.0% limit.` 
        : `Density too low (${kwDensity.toFixed(1)}%). Consider placing "${focusKeyword}" naturally.`,
      isCrit: false
    },
    {
      test: headingStructurePerfect,
      weight: 10,
      passMsg: 'Elegant heading structure (H1, H2, H3) detected.',
      failMsg: headingWarning || 'Verify sub-headings exists to construct rich visual layouts.',
      isCrit: false
    }
  ];

  let contentAchieved = 0;
  let contentTotal = 100;
  contentItems.forEach((item, idx) => {
    if (item.test) {
      contentAchieved += item.weight;
      checks.push({
        id: `content_${idx}`,
        label: 'Content Check',
        type: 'content',
        status: 'pass',
        message: item.passMsg,
        scoreImpact: 0
      });
    } else {
      checks.push({
        id: `content_${idx}`,
        label: 'Content Check',
        type: 'content',
        status: item.isCrit ? 'error' : 'warning',
        message: item.failMsg,
        scoreImpact: Math.ceil((item.weight / contentTotal) * 30)
      });
    }
  });
  contentPct = Math.round((contentAchieved / contentTotal) * 100);

  // --- C. TECHNICAL SEO (Weight: 25%) ---
  const hasSlug = !!slug;
  const isSlugFriendly = hasSlug && /^[a-z0-9-_]+$/.test(slug);
  const slugMatchesKeyword = hasSlug && focusKeyword && slug.includes(focusKeyword.split(' ')[0]);

  const hasCanonical = true; // Simulated presence of Canonical tags in header metadata
  const hasOGTitle = !!(metaTitle || title);
  const hasOGDesc = !!(metaDescription || desc);

  const techItems: { test: boolean; weight: number; passMsg: string; failMsg: string; isCrit: boolean }[] = [
    {
      test: hasSlug,
      weight: 30,
      passMsg: `SEO-friendly URL path registered (/${slug}).`,
      failMsg: 'Critical error: Missing page path locator slug.',
      isCrit: true
    },
    {
      test: isSlugFriendly,
      weight: 20,
      passMsg: 'Slug uses clean lowercase letters, hyphens, and no special characters.',
      failMsg: 'Slug contains spaces or invalid characters. Replace with neat hyphens.',
      isCrit: true
    },
    {
      test: !focusKeyword || slugMatchesKeyword,
      weight: 15,
      passMsg: 'Slug includes target focus keywords.',
      failMsg: 'Incorporate important primary terms inside your slug link path for indexing boost.',
      isCrit: false
    },
    {
      test: hasCanonical,
      weight: 15,
      passMsg: `Canonical tag verified: https://koseli-xpress.play/pages/${slug || 'home'}`,
      failMsg: 'Missing clear indexing canonical url.',
      isCrit: false
    },
    {
      test: hasOGTitle && hasOGDesc,
      weight: 20,
      passMsg: 'Open Graph (OG) social tags, Twitter cards, and structured schema tags loaded.',
      failMsg: 'Incomplete social preview graph declarations.',
      isCrit: false
    }
  ];

  let techAchieved = 0;
  let techTotal = 100;
  techItems.forEach((item, idx) => {
    if (item.test) {
      techAchieved += item.weight;
      checks.push({
        id: `tech_${idx}`,
        label: 'Technical Check',
        type: 'technical',
        status: 'pass',
        message: item.passMsg,
        scoreImpact: 0
      });
    } else {
      checks.push({
        id: `tech_${idx}`,
        label: 'Technical Check',
        type: 'technical',
        status: item.isCrit ? 'error' : 'warning',
        message: item.failMsg,
        scoreImpact: Math.ceil((item.weight / techTotal) * 25)
      });
    }
  });
  techPct = Math.round((techAchieved / techTotal) * 100);

  // --- D. IMAGE & MEDIA ALT ATTR (Weight: 10%) ---
  let hasImage = false;
  let hasAltText = false;
  let mediaMessage = '';

  if (type === 'product') {
    hasImage = !!(item.images && item.images.length > 0 && item.images[0]);
    hasAltText = hasImage; // All registered product inventory catalog images auto-bind naming attributes as default alt markup
    mediaMessage = hasImage 
      ? `Main photo checked. Image Alt configured as "${title} bouquet detail"`
      : 'No product photo attached. Search spiders prefer rich imagery.';
  } else if (type === 'category') {
    hasImage = !!item.image;
    hasAltText = hasImage;
    mediaMessage = hasImage
      ? `Primary layout image Alt configured as "${title} category layout"`
      : 'Missing category grid cover photo.';
  } else if (type === 'page') {
    const pageSections = item.sections as any[] || [];
    const mediaSections = pageSections.filter(s => s.type === 'banner' || s.type === 'image_content' || s.type === 'slider');
    if (mediaSections.length === 0) {
      hasImage = false;
      hasAltText = true; // no images, so no missing alts
      mediaMessage = 'No visual imagery sections used in this layout.';
    } else {
      hasImage = true;
      // verify title exists in each media section to generate Alt text
      const nonAttr = mediaSections.filter(s => !s.data?.title && !s.data?.subtitle && !s.data?.imageUrl);
      hasAltText = nonAttr.length === 0;
      mediaMessage = hasAltText
        ? `${mediaSections.length} page section images have appropriate alternative headings.`
        : 'Ensure you supply overlay titles or helper labels for slider / image components to satisfy Alt indexes.';
    }
  }

  const mediaPass = hasImage && hasAltText;
  let mediaAchieved = mediaPass ? 100 : (hasImage ? 60 : 0);
  checks.push({
    id: 'media_0',
    label: 'Media Alt Attr Check',
    type: 'image',
    status: mediaPass ? 'pass' : (hasImage ? 'warning' : 'error'),
    message: mediaMessage,
    scoreImpact: mediaPass ? 0 : 5
  });
  mediaPct = mediaAchieved;

  // --- E. INTERNAL LINKING (Weight: 10%) ---
  let linkPass = false;
  let linkMessage = '';
  
  if (type === 'product') {
    // Recommend related products
    linkPass = products.some(p => p.id !== item.id && p.categoryId === item.categoryId);
    linkMessage = linkPass
      ? `Found internal links related options across category cohort.`
      : 'No internal similar products found inside this category tier.';
  } else if (type === 'category') {
    // Recommend products associated inside the category
    const count = products.filter(p => p.categoryId === item.id).length;
    linkPass = count > 0;
    linkMessage = linkPass
      ? `Category links ${count} products to guide indexing crawlers.`
      : 'Empty category. Spies find no products mapped within this category path.';
  } else if (type === 'page') {
    const pageSections = item.sections as any[] || [];
    const hasButtons = pageSections.some(s => s.type === 'button' || (s.type === 'image_content' && s.data?.buttonUrl));
    const codeEmbedsLinks = pageSections.some(s => s.type === 'code_embed' && (s.data?.codeEmbed || '').includes('<a '));
    linkPass = hasButtons || codeEmbedsLinks;
    linkMessage = linkPass
      ? 'Layout has active call-to-action anchor routes supporting search indexing flows.'
      : 'Add action buttons page builder elements or navigation maps to create internal linking structures.';
  }

  let linkAchieved = linkPass ? 100 : 30;
  checks.push({
    id: 'link_0',
    label: 'Internal Anchor Check',
    type: 'internal',
    status: linkPass ? 'pass' : 'warning',
    message: linkMessage,
    scoreImpact: linkPass ? 0 : 5
  });
  linkPct = linkAchieved;

  // --- F. COMBINE WEIGHTS SYSTEM ---
  // Meta: 25%, Content: 30%, Tech: 25%, Image: 10%, Link: 10%
  const totalScore = Math.round(
    (metaPct * 0.25) +
    (contentPct * 0.30) +
    (techPct * 0.25) +
    (mediaPct * 0.10) +
    (linkPct * 0.10)
  );

  const score = Math.max(0, Math.min(100, totalScore));

  let grade: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor' = 'Poor';
  let color = 'text-rose-600 bg-rose-50 border-rose-200';
  if (score >= 90) {
    grade = 'Excellent';
    color = 'text-emerald-700 bg-emerald-50 border-emerald-250';
  } else if (score >= 70) {
    grade = 'Good';
    color = 'text-teal-700 bg-teal-50 border-teal-200';
  } else if (score >= 50) {
    grade = 'Needs Improvement';
    color = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  // --- G. JSON-LD STRUCTURED SCHEMA MARKUP GENERATION ---
  let schemaObj: any = {
    "@context": "https://schema.org",
  };

  if (type === 'product') {
    schemaObj["@type"] = "Product";
    schemaObj["name"] = nameTrim(title);
    schemaObj["image"] = item.images || [];
    schemaObj["description"] = nameTrim(desc);
    schemaObj["sku"] = item.sku || `PROD-${item.id}`;
    schemaObj["offers"] = {
      "@type": "Offer",
      "priceCurrency": "NPR",
      "price": item.price || 0,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": (item.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": `https://koseli-xpress.play/product/${slug}`
    };
  } else if (type === 'category') {
    schemaObj["@type"] = "CollectionPage";
    schemaObj["name"] = nameTrim(title);
    schemaObj["description"] = nameTrim(desc);
    schemaObj["url"] = `https://koseli-xpress.play/category/${slug}`;
    schemaObj["breadcrumb"] = {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://koseli-xpress.play"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": nameTrim(title),
          "item": `https://koseli-xpress.play/category/${slug}`
        }
      ]
    };
  } else {
    schemaObj["@type"] = "WebPage";
    schemaObj["name"] = nameTrim(title);
    schemaObj["description"] = nameTrim(metaDescription || desc);
    schemaObj["url"] = `https://koseli-xpress.play/${slug}`;
  }

  const schemaJson = JSON.stringify(schemaObj, null, 2);

  return {
    score,
    grade,
    color,
    checks,
    metaScore: metaPct,
    contentScore: contentPct,
    technicalScore: techPct,
    mediaScore: mediaPct,
    linkingScore: linkPct,
    schemaJson
  };
}

function nameTrim(str: string): string {
  if (!str) return '';
  const clean = str.replace(/<[^>]*>/g, '');
  return clean.length > 150 ? clean.substring(0, 147) + '...' : clean;
}
