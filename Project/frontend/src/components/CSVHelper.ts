import { Product, ProductStatus, Category } from '../types';

export function exportProductsToCSV(products: Product[]): string {
  const headers = [
    'SKU',
    'Name',
    'Slug',
    'BrandId',
    'CategoryId',
    'PriceNPR',
    'CostPriceNPR',
    'Stock',
    'LowStockThreshold',
    'Status',
    'Description',
    'Images',
    'IsHamper'
  ];

  const rows = products.map(p => [
    `"${p.sku.replace(/"/g, '""')}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.slug.replace(/"/g, '""')}"`,
    `"${p.brandId.replace(/"/g, '""')}"`,
    `"${p.categoryId.replace(/"/g, '""')}"`,
    p.price,
    p.costPrice,
    p.stock,
    p.lowStockThreshold,
    p.status,
    `"${(p.description || '').replace(/"/g, '""')}"`,
    `"${p.images.join(',')}"`,
    p.isHamper ? 'TRUE' : 'FALSE'
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Automatically cleans up HTML-heavy descriptions into beautiful normal text.
 * Strips out redundant boilerplate lines (tutorials, order tutorials, WhatsApp, shipping signatures, and images).
 */
export function convertHTMLToNormalText(htmlStr: string): string {
  if (!htmlStr) return '';

  // If it's not HTML at all, just return it trimmed
  if (!/<[a-z/][^>]*>/i.test(htmlStr)) {
    return htmlStr.trim();
  }

  let text = htmlStr;

  // 1. Remove <img> tags cleanly
  text = text.replace(/<img[^>]*>/gi, '');

  // 2. Custom block replacements for common boilerplate elements we want to prune
  text = text.replace(/<h[1-6][^>]*>How To Order[\s\S]*?<\/h[1-6]>/gi, '');
  text = text.replace(/<p[^>]*>How To Order[\s\S]*?<\/p>/gi, '');
  text = text.replace(/<a[^>]*href="[^"]*tutorial[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');
  text = text.replace(/<p[^>]*><a[^>]*>Product Details[\s\S]*?<\/a><\/p>/gi, '');
  text = text.replace(/<a[^>]*>Product Details<\/a>/gi, '');

  // Filter out WhatsApp boilerplate blocks
  text = text.replace(/<p[^>]*>For any further information[\s\S]*?WhatsApp[\s\S]*?<\/p>/gi, '');
  text = text.replace(/<p[^>]*>The product will[\s\S]*?relocation\.<\/p>/gi, '');
  text = text.replace(/<p[^>]*>For any further information[\s\S]*?CSR[\s\S]*?<\/p>/gi, '');
  
  // Filter out "other products in store"
  text = text.replace(/<p[^>]*>Koseli Xpress\s*-\s*<a[^>]*>Other Products[\s\S]*?<\/p>/gi, '');
  text = text.replace(/Koseli Xpress\s*-\s*Other Products[\s\S]*/gi, '');

  // Filter out the happiness banner
  text = text.replace(/<p[^>]*>We deliver happiness across Nepal[\s\S]*?<\/p>/gi, '');
  text = text.replace(/We deliver happiness across Nepal.*/gi, '');

  // 3. Convert headers into clear plain-text section names
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n$1\n');

  // 4. Convert list items <li> into bullet points
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1');

  // 5. Replace paragraph/div tags with newlines
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  text = text.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 6. Strip all remaining HTML tags completely (like span, strong, em, a, etc.)
  text = text.replace(/<[^>]+>/g, '');

  // 7. Resolve HTML entities (e.g., &nbsp;, &amp;, &lt;, &gt;)
  text = text.replace(/&nbsp;/gi, ' ')
             .replace(/&amp;/gi, '&')
             .replace(/&lt;/gi, '<')
             .replace(/&gt;/gi, '>')
             .replace(/&quot;/gi, '"');

  // 8. Clean up line formatting
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let prevWasEmpty = false;

  for (let line of lines) {
    // Strip trailing/leading spaces, replace multiple spaces
    line = line.replace(/\s+/g, ' ').trim();
    
    // Skip boilerplate remnants
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.includes('how to order gift') ||
      lowerLine.includes('view tutorial') ||
      lowerLine.includes('product details') ||
      lowerLine.includes('click here to check') ||
      lowerLine.includes('for any further information') ||
      lowerLine.includes('whatsapp +977') ||
      lowerLine.includes('whatsapp') ||
      lowerLine.includes('deliver happiness across nepal') ||
      lowerLine === '•' ||
      lowerLine === '*' ||
      lowerLine === ''
    ) {
      continue;
    }

    if (line === '') {
      if (!prevWasEmpty) {
        cleanedLines.push('');
        prevWasEmpty = true;
      }
    } else {
      cleanedLines.push(line);
      prevWasEmpty = false;
    }
  }

  return cleanedLines.join('\n').trim();
}

/**
 * Automatically filters and standardizes raw CSV description content into beautiful plain normal text.
 */
export function convertPlainTextToHTML(plainText: string): string {
  if (!plainText) return '';
  
  // If it contains HTML elements, convert it to clean normal text
  if (/<[a-z/][^>]*>/i.test(plainText)) {
    return convertHTMLToNormalText(plainText);
  }

  // Otherwise keep plain text as-is
  return plainText.trim();
}

function processInlineStyles(text: string): string {
  let res = text;

  // Match "How to Order" text to premium colored hyperlinked tutorial
  if (/how\s+to\s+order\s+gift/i.test(res)) {
    return `<span style="color: rgb(121, 80, 242)">* How To Send Gifts to Nepal from Koseli Xpress Website </span><span style="color: rgb(230, 73, 128)">(</span><a target="_blank" rel="noopener noreferrer nofollow" href="https://koselixpress.com/p/how-to-order-gift-from-koseli-xpress-website"><span style="color: rgb(230, 73, 128)"><strong><u>Click Here To View Tutorial</u></strong></span></a><span style="color: rgb(230, 73, 128)">)</span>`;
  }

  // Match delivery location info to locations link
  if (/200\+\s+locations|view\s+for\s+locations/i.test(res)) {
    return `* This product is currently available all over Nepal 200+ Locations <a target="_blank" rel="noopener noreferrer nofollow" href="https://koselixpress.com/p/delivery-information"><span style="color: rgb(230, 73, 128)"><strong><u>(View for locations)</u></strong></span></a>`;
  }

  // Match active Whatsapp context to dynamic link
  if (/whatsapp/i.test(res)) {
    return `For any further information / any help kindly chat with our CSR <a target="_blank" rel="noopener noreferrer nofollow" href="https://api.whatsapp.com/send/?phone=9779801354451&amp;text=Source:%20https://koselixpress.com/"><strong><u>WhatsApp +977-9801354451</u></strong></a>`;
  }

  // Match overall collection link placeholder
  if (/other\s+products\s+in\s+our\s+store/i.test(res)) {
    return `Koseli Xpress - <a target="_blank" rel="noopener noreferrer nofollow" href="https://koselixpress.com/products"><span style="color: rgb(121, 80, 242)"><strong><u>Other Products in our Store (Click here to Check)</u></strong></span></a>`;
  }

  // Parse generic Markdown links: [Title](URL)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a target="_blank" rel="noopener noreferrer nofollow" href="$2"><u>$1</u></a>');

  // Convert raw URLs (not inside tags) to clickable anchors if any
  res = res.replace(/(?<!href=")(https?:\/\/[^\s\)<>]+)/g, '<a target="_blank" rel="noopener noreferrer nofollow" href="$1"><u>$1</u></a>');

  // Multi-byte dash symbols replacement to standard hyphen readability
  res = res.replace(/–/g, '-');

  // Markdown bold and italics parsing
  res = res.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  res = res.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Custom highlights for key areas
  res = res.replace(/(Kathmandu|Lalitpur|Bhaktapur|Nepal)/g, '<strong>$1</strong>');

  return res;
}

/**
 * Stateful character-by-character CSV cell splitter
 * Correctly handles escaped double-quotes and newlines embedded within quoted fields
 */
export function parseCSVText(csvText: string): string[][] {
  const result: string[][] = [];
  let currentWord = '';
  let insideQuotes = false;
  let currentRow: string[] = [];
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    
    if (char === '"') {
      if (insideQuotes && csvText[i + 1] === '"') {
        // Escaped quote like "" inside quote
        currentWord += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentWord);
      currentWord = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentWord);
      result.push(currentRow);
      currentRow = [];
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  
  if (currentWord || currentRow.length > 0) {
    currentRow.push(currentWord);
    result.push(currentRow);
  }
  
  return result;
}

/**
 * Parsed Products and Categories from standard catalog CSV format or base format.
 * Dynamically resolves categories and auto-creates them if they do not exist
 */
export function parseProductsFromCSV(
  csvText: string,
  existingCategories: Category[] = []
): {
  products: Product[];
  newCategories: Category[];
  warnings: string[];
} {
  const rows = parseCSVText(csvText).map(row => row.map(cell => cell.trim())).filter(row => row.length > 0 && row.some(cell => cell !== ''));
  const warnings: string[] = [];
  
  if (rows.length <= 1) {
    return { products: [], newCategories: [], warnings: ['The CSV file appears to be empty or contains only headers.'] };
  }

  const rawHeaders = rows[0];
  const headerIndexMap: Record<string, number> = {};
  const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  rawHeaders.forEach((h, idx) => {
    const lowered = h.toLowerCase().trim();
    headerIndexMap[lowered] = idx;
    headerIndexMap[normalizeHeader(h)] = idx;
  });

  const products: Product[] = [];
  const newCategories: Category[] = [];
  const usedSkus = new Set<string>();

  // Keys lists for flexible column mapping matching registry CSV columns
  const idKeys = ['id', 'product_id'];
  const nameKeys = ['product_name', 'name', 'title'];
  const priceKeys = ['price', 'pricenpr', 'price_npr', 'sellingprice', 'selling_price', 'saleprice', 'sale_price', 'regularprice', 'regular_price'];
  const crossedPriceKeys = ['crossedprice', 'crossed_price', 'compareatprice', 'compare_at_price', 'originalprice', 'original_price', 'mrp'];
  const costKeys = ['yourbuyingcost', 'your_buying_cost', 'costprice', 'cost_price', 'costspri_cen_p_r', 'costpricenpr'];
  const stockKeys = ['quantity', 'qty', 'stock', 'inventory', 'inventoryquantity', 'inventory_quantity'];
  const weightKeys = ['weight', 'product_weight'];
  const skuKeys = ['sku'];
  const barcodeKeys = ['barcode'];
  const sellAfterOutOfStockKeys = ['sell_after_out_of_stock', 'sell_after_out_of_stock_enabled'];
  const groupKeys = ['group', 'product_group'];
  const variantKeys = ['variant', 'product_variant'];
  const sizeKeys = ['size', 'product_size'];
  const slugKeys = ['slug'];
  const statusKeys = ['status'];
  const categoryKeys = ['productcategory', 'product_category', 'categoryid', 'category', 'categories'];
  const imageKeys = ['images', 'imageurl', 'image_url', 'image', 'imagesection', 'image_section', 'photourl', 'photo_url', 'photo', 'productimage', 'product_image', 'productimages', 'product_images', 'productimageurl', 'product_image_url', 'image1', 'image2', 'image3', 'imagesrc', 'image_src'];
  const descriptionKeys = ['product_description', 'description'];
  const isHamperKeys = ['is_hamper', 'true_hamper', 'ishamper'];
  const lowStockKeys = ['lowstockthreshold', 'low_stock_threshold', 'low_stock'];

  const parseNumber = (value: string): number => {
    const cleaned = value
      .replace(/रू|rs\.?|npr|रु/gi, '')
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '')
      .trim();
    return parseFloat(cleaned);
  };

  const normalizeImageUrl = (value: string): string => {
    const cleaned = value
      .replace(/&amp;/g, '&')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .replace(/[)\].,;]+$/g, '')
      .trim();
    if (!cleaned) return '';
    return cleaned.startsWith('//') ? `https:${cleaned}` : cleaned;
  };

  const splitImages = (value: string): string[] => {
    const srcMatches = Array.from(value.matchAll(/src=["']([^"']+)["']/gi)).map(match => match[1]);
    const urlMatches = Array.from(value.matchAll(/https?:\/\/[^\s,|;'"<>]+/gi)).map(match => match[0]);
    const candidates = srcMatches.length > 0 || urlMatches.length > 0
      ? [...srcMatches, ...urlMatches]
      : value.split(/[,\n|;]/);

    return Array.from(new Set(candidates.map(normalizeImageUrl).filter(Boolean)));
  };

  for (let i = 1; i < rows.length; i++) {
    const rowValues = rows[i];
    
    const getVal = (keys: string[], defaultVal = ''): string => {
      for (const k of keys) {
        const idx = headerIndexMap[k] ?? headerIndexMap[normalizeHeader(k)];
        if (idx !== undefined && rowValues[idx] !== undefined) {
          const value = rowValues[idx];
          if (value !== '') return value;
        }
      }
      return defaultVal;
    };

    const getVals = (keys: string[]): string[] => {
      const values: string[] = [];
      const seenIndexes = new Set<number>();
      for (const k of keys) {
        const idx = headerIndexMap[k] ?? headerIndexMap[normalizeHeader(k)];
        if (idx !== undefined && !seenIndexes.has(idx)) {
          seenIndexes.add(idx);
          const value = rowValues[idx]?.trim();
          if (value) values.push(value);
        }
      }
      return values;
    };

    const rawName = getVal(nameKeys);
    // Basic validation on required field (Product Name)
    if (!rawName || rawName.toLowerCase() === 'product_name') {
      warnings.push(`Row ${i + 1}: Skipped product due to missing name.`);
      continue;
    }

    // Dynamic ID mapping or generation
    const rawId = getVal(idKeys).trim();
    const id = (rawId && rawId !== 'id') ? rawId : `prod-imported-${Math.floor(Math.random() * 900000 + 100000)}`;

    // Dynamic slug generation if slug is blank or not provide
    let slug = getVal(slugKeys);
    if (!slug) {
      slug = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Dynamic SKU generation if sku is blank
    let sku = getVal(skuKeys);
    if (!sku) {
      sku = `SKU-CSV-${slug.substring(0, 15).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    }

    // Handle collision of SKUs inside the same CSV file
    let finalSku = sku;
    if (usedSkus.has(finalSku)) {
      finalSku = `${sku}-${Math.floor(Math.random() * 900 + 100)}`;
      warnings.push(`Row ${i + 1} (${rawName}): Duplicate SKU "${sku}" found. Auto-assigned fallback SKU "${finalSku}".`);
    }
    usedSkus.add(finalSku);

    // Price handling with basic validation
    const rawPrice = getVal(priceKeys);
    let parsedPrice = parseNumber(rawPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      parsedPrice = 0;
      warnings.push(`Row ${i + 1} (${rawName}): Invalid price expression "${rawPrice}". Defaulted to 0.`);
    }

    const rawCrossedPrice = getVal(crossedPriceKeys);
    let parsedCrossedPrice = parseNumber(rawCrossedPrice) || 0;
    if (isNaN(parsedCrossedPrice) || parsedCrossedPrice < 0) {
      parsedCrossedPrice = 0;
    }

    let price = parsedPrice;
    let discountPrice: number | undefined = undefined;

    if (parsedCrossedPrice > 0 && parsedCrossedPrice > parsedPrice) {
      price = parsedCrossedPrice;
      discountPrice = parsedPrice;
    }

    const rawCost = getVal(costKeys);
    let costPrice = parseNumber(rawCost);
    if (isNaN(costPrice) || costPrice < 0) {
      costPrice = 0;
      if (rawCost !== '' && rawCost !== '0') {
        warnings.push(`Row ${i + 1} (${rawName}): Buying cost "${rawCost}" is invalid. Defaulted to 0.`);
      }
    }

    const rawStock = getVal(stockKeys);
    let stock = parseInt(rawStock);
    if (isNaN(stock) || stock < 0) {
      stock = 10;
      warnings.push(`Row ${i + 1} (${rawName}): Stock/quantity value "${rawStock}" is invalid. Defaulted to 10.`);
    }

    const lowStockThreshold = parseInt(getVal(lowStockKeys)) || 2;

    const rawStatus = getVal(statusKeys);
    const status = (!rawStatus || rawStatus.toLowerCase() === 'active' || rawStatus.toLowerCase() === 'published' || rawStatus.toLowerCase() === 'publish' || rawStatus.toLowerCase() === 'y' || rawStatus.toLowerCase() === 'yes' || rawStatus.toLowerCase() === 'true')
      ? ProductStatus.ACTIVE
      : ProductStatus.DRAFT;

    const rawDescription = getVal(descriptionKeys) || '';
    const description = convertPlainTextToHTML(rawDescription);
    const imagesValues = getVals(imageKeys);
    const images = imagesValues.length > 0
      ? imagesValues.flatMap(splitImages)
      : ['https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'];

    const rawIsHamper = getVal(isHamperKeys);
    const isHamper = rawIsHamper.toUpperCase() === 'TRUE' ||
                     rawIsHamper.toUpperCase() === 'YES' ||
                     rawIsHamper.toUpperCase() === 'Y' ||
                     rawName.toLowerCase().includes('combo') ||
                     rawName.toLowerCase().includes('hamper');

    // Parse categories (Support multiple categories using "/" as the separator)
    const categoryStr = getVal(categoryKeys);
    const categoryNames = categoryStr
      ? categoryStr.split(/[/|,;>]+/).map(c => c.trim()).filter(Boolean)
      : [];

    if (categoryNames.length === 0) {
      warnings.push(`Row ${i + 1} (${rawName}): Category not specified. Defaulting to general Handwrapped Gifts catalog.`);
    }

    const assignedCategoryIds: string[] = [];
    let parentCatId: string | undefined = undefined;

    categoryNames.forEach(catName => {
      const catSlug = catName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if category already exists in database or already parsed in this batch
      let matchedCategory = existingCategories.find(c => c.slug === catSlug || c.name.toLowerCase() === catName.toLowerCase()) ||
                            newCategories.find(c => c.slug === catSlug || c.name.toLowerCase() === catName.toLowerCase());

      if (!matchedCategory) {
        matchedCategory = {
          id: `cat-created-${catSlug || Math.floor(Math.random() * 90000 + 10000)}`,
          name: catName,
          slug: catSlug,
          description: `Shop selected ${catName} products online at Koseli Xpress.`,
          image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=150&auto=format&fit=crop',
          metaTitle: `${catName} | Koseli Xpress`,
          metaDescription: `Discover and send lovely ${catName} gifts to Nepal securely.`,
          metaKeywords: `${catName.toLowerCase()}, koseli xpress, send gift nepal`,
          showInNavbar: true,
          priority: 20 + existingCategories.length + newCategories.length,
          parentCategoryId: parentCatId
        };
        newCategories.push(matchedCategory);
      }

      assignedCategoryIds.push(matchedCategory.id);
      parentCatId = matchedCategory.id;
    });

    // If no category specified, fallback to a default
    const categoryId = assignedCategoryIds[0] || 'cat-hampers';
    const categoryIds = assignedCategoryIds.length > 0 ? assignedCategoryIds : ['cat-hampers'];

    // Map additional detail properties required for this file format
    const barcode = getVal(barcodeKeys) || undefined;
    const rawWeight = getVal(weightKeys);
    const weight = rawWeight !== '' ? (isNaN(Number(rawWeight)) ? rawWeight : Number(rawWeight)) : undefined;
    const group = getVal(groupKeys) || undefined;
    const variant = getVal(variantKeys) || undefined;
    const size = getVal(sizeKeys) || undefined;

    // Out of Stock purchasing check
    const rawSellAfter = getVal(sellAfterOutOfStockKeys);
    const allowOrderWhenOutOfStock = (rawSellAfter.toLowerCase() === 'y' || rawSellAfter.toLowerCase() === 'yes' || rawSellAfter.toLowerCase() === 'true');

    products.push({
      id,
      sku: finalSku,
      name: rawName,
      slug,
      brandId: 'brand-local',
      categoryId,
      categoryIds,
      description,
      images,
      price,
      costPrice,
      stock,
      lowStockThreshold,
      status,
      isHamper,
      discountPrice,
      metaTitle: `${rawName} | Koseli Xpress`,
      metaDescription: `Buy high quality ${rawName} online in Kathmandu, Lalitpur, Bhaktapur, Nepal.`,
      metaKeywords: `${rawName.toLowerCase()}, koseli gifts`,
      barcode,
      weight,
      group,
      variant,
      size,
      allowOrderWhenOutOfStock
    });
  }

  return { products, newCategories, warnings };
}

export function triggerCSVDownload(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
