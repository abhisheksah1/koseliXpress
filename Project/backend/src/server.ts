import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, isMongoConnected } from './config/db.js';
import { getApiStore, saveApiStore } from './services/apiStoreService.js';
import { getAppState, syncLocalAppStateToMongo } from './services/appStateService.js';
import { seedPaymentGatewaysFromEnv } from './services/paymentGatewayService.js';
import {
  getSuperAdminSeedStatus,
  seedSuperAdmin,
} from './services/seedService.js';
import storeRoutes from './routes/storeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './modules/payment/routes/payment.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let syncedCatalog: {
  products: any[];
  deliveryDistricts: any[];
  coupons: any[];
  serviceFees: any[];
} = {
  products: [],
  deliveryDistricts: [],
  coupons: [],
  serviceFees: []
};


// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const store = await getAppState();
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    database: isMongoConnected() ? 'mongodb' : 'local-store',
    mongoConnected: isMongoConnected(),
    offlineLocalStore: !isMongoConnected(),
    counts: {
      pages: Array.isArray(store?.pages) ? store.pages.length : 0,
      products: Array.isArray(store?.products) ? store.products.length : 0,
      activeProducts: Array.isArray(store?.products)
        ? store.products.filter((product: any) => product?.status === 'active').length
        : 0,
      categories: Array.isArray(store?.categories) ? store.categories.length : 0,
    },
  });
});

// Super admin seed status (verify MongoDB has seeded credentials)
app.get('/api/admin/seed-status', async (_req, res) => {
  try {
    const status = await getSuperAdminSeedStatus();
    res.json(status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read seed status';
    res.status(500).json({ error: message });
  }
});

// Re-run super admin seed merge (development / setup)
app.post('/api/admin/seed', async (_req, res) => {
  try {
    const result = await seedSuperAdmin();
    const status = await getSuperAdminSeedStatus();
    res.json({ success: true, ...result, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Seed failed';
    res.status(500).json({ error: message });
  }
});

// App store state (replaces frontend localStorage)
app.use('/api/store', storeRoutes);

// Customer Google / Auth0 authentication
app.use('/api/auth', authRoutes);

// Payment module (eSewa, Khalti, Fonepay, Card/NPS)
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes);

// Nepal Rastra Bank Forex Rate PROXY API
app.get('/api/forex/rate/:currencyCode', async (req, res) => {
  const currencyCode = req.params.currencyCode.toUpperCase();
  
  try {
    const formatDate = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const today = new Date();
    const toStr = formatDate(today);
    
    const past = new Date();
    past.setDate(today.getDate() - 10); // Query past 10 days to guarantee holiday / weekend coverage
    const fromStr = formatDate(past);

    const url = `https://www.nrb.org.np/api/forex/v1/rates?page=1&per_page=100&from=${fromStr}&to=${toStr}`;
    console.log(`Fetching forex rates from NRB URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NRB API server responded with status ${response.status}`);
    }
    
    const result: any = await response.json();
    const payload = result?.data?.payload;
    
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return res.status(404).json({ error: 'No rate payload sheets returned from NRB API' });
    }
    
    // Sort descending by date to obtain the latest rates
    const sortedPayload = [...payload].sort((a: any, b: any) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    let foundRate: any = null;
    let foundDate: string = '';
    
    for (const dayData of sortedPayload) {
      if (dayData && Array.isArray(dayData.rates)) {
        const rateObj = dayData.rates.find((r: any) => r?.currency?.iso3?.toUpperCase() === currencyCode);
        if (rateObj) {
          foundRate = rateObj;
          foundDate = dayData.date;
          break;
        }
      }
    }
    
    if (!foundRate) {
      return res.status(404).json({ error: `Currency code ${currencyCode} was not found in recent Nepal Rastra Bank records.` });
    }
    
    const unit = parseFloat(foundRate.currency?.unit || '1');
    const sell = parseFloat(foundRate.sell || '0');
    const buy = parseFloat(foundRate.buy || '0');
    
    if (sell <= 0) {
      return res.status(400).json({ error: `Invalid NRB sell rate of ${sell}` });
    }
    
    // multiplier (1 NPR = X local) => unit / sell rate
    const rateToForeign = unit / sell;
    
    res.json({
      success: true,
      currencyCode,
      name: foundRate.currency?.name,
      unit,
      buy,
      sell,
      rateToForeign,
      publishedDate: foundDate
    });
    
  } catch (err: any) {
    console.error('NRB Forex proxy failure:', err);
    res.status(500).json({ error: err.message || 'Failed to communicate with NRB Forex API' });
  }
});

// SEO Generation endpoint using gemini-3.5-flash
app.post('/api/seo', async (req, res) => {
  const { type, name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const prompt = `Generate optimistic, high-ranking e-commerce SEO metadata (Meta Title, Meta Description, and Meta Keywords) in English for a ${type || 'product'}.
    Name/Title: "${name}"
    Description: "${description || ''}"
    Include e-commerce appeal (pricing, delivery inside Nepal, quality, gifts). Ensure the results are tailored specifically for search engines.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            metaTitle: { 
              type: Type.STRING, 
              description: 'Exquisite, click-optimized meta title under 60 characters with branding' 
            },
            metaDescription: { 
              type: Type.STRING, 
              description: 'Compelling action-oriented meta description under 155 characters' 
            },
            metaKeywords: { 
              type: Type.STRING, 
              description: 'Comma separated list of 5-8 highly relevant keywords' 
            }
          },
          required: ['metaTitle', 'metaDescription', 'metaKeywords']
        }
      }
    });

    const bodyText = response.text?.trim() || '{}';
    const seoData = JSON.parse(bodyText);
    res.json(seoData);
  } catch (error: any) {
    console.error('Gemini API SEO error:', error);
    // Return graceful defaults if API key is missing or failed
    res.json({
      metaTitle: `${name} | Koseli Xpress Nepal`,
      metaDescription: `Buy premium ${name} online in Nepal from Koseli Xpress. Hand-wrapped luxury gifts and gourmet items dispatched instantly.`,
      metaKeywords: `${name.toLowerCase()}, koseli xpress, gift in nepal, kathmandu buy`
    });
  }
});

// Social Caption and Hashtag Generator utilizing Server-Side Gemini
app.post('/api/gemini/social-caption', async (req, res) => {
  const { productName, productDescription, productPrice, platforms } = req.body;
  if (!productName) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    const platformsStr = Array.isArray(platforms) ? platforms.join(', ') : 'Facebook, Instagram';
    const prompt = `Generate highly engaging, sales-focused social media caption & hashtags tailored for these platforms: ${platformsStr}.
    
    Product details:
    Name: "${productName}"
    Description: "${productDescription || ''}"
    Price: "${productPrice || ''}"
    
    The caption should:
    1. Hook the audience instantly with relevant emojis.
    2. Outline a compelling value proposition and emotional angle (gifting, love, luxury, surprise).
    3. Include a very clear CALL TO ACTION inviting users to buy online at Koseli Xpress.
    4. Provide a placeholder for the product link like [PRODUCT_LINK].
    5. List 10 to 15 highly engaging, relevant hashtags tailored for increasing sales in Nepal (e.g., #koselixpress, #giftnepal, #nepalgifts).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { 
              type: Type.STRING, 
              description: 'The full engaging post caption with emotional hook and CTA' 
            },
            hashtags: { 
              type: Type.STRING, 
              description: 'Space separated social media hashtags starting with #' 
            }
          },
          required: ['caption', 'hashtags']
        }
      }
    });

    const bodyText = response.text?.trim() || '{}';
    const captionData = JSON.parse(bodyText);
    res.json(captionData);
  } catch (error: any) {
    console.error('Gemini social marketing caption error:', error);
    res.json({
      caption: `🎁 Elevate your gifting game with our beautiful ${productName}! Perfect for creating unforgettable moments with your loved ones. Handcrafted, premium quality, and delivered with care across Nepal. ✨ Buy yours today at Koseli Xpress!\n\n🔗 Shop here: [PRODUCT_LINK]`,
      hashtags: `#koselixpress #nepalgifts #gift_delivery #nepal #onlinegifting #sendgiftnepal`
    });
  }
});

// AI Blog Post Writer utilizing Server-Side Gemini
app.post('/api/gemini/write-blog', async (req, res) => {
  const { subject } = req.body;
  if (!subject) {
    return res.status(400).json({ error: 'Blog subject is required' });
  }

  try {
    const prompt = `You are a professional SEO copywriter and expert in e-commerce content marketing. 
    Write a 100% SEO-friendly, comprehensive, and engaging blog post about the subject: "${subject}".
    
    The post must include:
    - An optimized, catchy click-worthy Blog Title
    - A URL-friendly slug based on the title (lowercase, hyphens only, e.g. "perfect-gifts-for-parents")
    - SEO focus keywords (comma-separated list of 5-8 strings)
    - A high-click-through Rate (CTR) Meta Description (under 160 characters)
    - The complete body content written in clean, beautifully structured HTML. 
      Use headers (<h2>, <h3>), paragraphs (<p>), bold text (<strong>), bulleted lists (<ul><li>), and sections. 
      The content should be at least 400-600 words of deeply engaging storytelling relating to gifting, express delivery across Nepal, gourmet foods, premium cakes, or flowers as appropriate for the topic.
      End the blog post with a welcoming invitation to shop on Koseli Xpress.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Catchy, SEO-optimized title for the blog post' },
            slug: { type: Type.STRING, description: 'URL slug, e.g. perfect-gifting-guide' },
            content: { type: Type.STRING, description: 'Complete well-structured HTML body content of the blog' },
            seoKeywords: { type: Type.STRING, description: 'Comma-separated focus keywords' },
            metaDescription: { type: Type.STRING, description: 'Highly optimized meta description for Google SERPs' }
          },
          required: ['title', 'slug', 'content', 'seoKeywords', 'metaDescription']
        }
      }
    });

    const bodyText = response.text?.trim() || '{}';
    const blogData = JSON.parse(bodyText);
    res.json(blogData);
  } catch (error: any) {
    console.error('Gemini AI Blog Writer error:', error);
    const mockSlug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    res.json({
      title: `The Ultimate Guide to ${subject}`,
      slug: mockSlug || 'ultimate-gifting-guide',
      content: `
        <h2>Discover the Best of ${subject}</h2>
        <p>Gifting is not just about material objects; it is about conveying your deepest emotions across distances. At <strong>Koseli Xpress</strong>, we represent that bridge of love and happiness across Nepal.</p>
        <h3>Why Gifting Matters</h3>
        <p>When you send gifts to Nepal from anywhere in the world, you are sharing a smiles. Here are some of our top tips:</p>
        <ul>
          <li><strong>Select Freshness:</strong> Opt for baked-on-delivery premium cakes and fresh-cut farm roses.</li>
          <li><strong>Personalize:</strong> Always append custom printed cards containing your personal words.</li>
          <li><strong>Reliable Dispatch:</strong> Ensure the courier guarantees express delivery directly to Kathmandu and beyond.</li>
        </ul>
        <p>Find everything you need to deliver happiness online today via Koseli Xpress!</p>
      `.trim(),
      seoKeywords: `${subject.toLowerCase()}, gift guide nepal, koseli xpress blog`,
      metaDescription: `Discover the ultimate guide to ${subject}. Send the finest express hampers, cakes, and gifts across Nepal with Koseli Xpress.`
    });
  }
});

// Gmail SMTP Configuration Testing Endpoint
app.post('/api/mail/test-smtp', async (req, res) => {
  const { gmailAddress, appPassword, senderName, replyToEmail, testRecipient } = req.body;

  if (!gmailAddress || !appPassword || !testRecipient) {
    return res.status(400).json({ error: 'Missing required credentials: gmailAddress, appPassword, and testRecipient are required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for port 465, false for 587
      auth: {
        user: gmailAddress,
        pass: appPassword,
      },
    });

    const mailOptions = {
      from: `"${senderName || 'Koseli Test Sender'}" <${gmailAddress}>`,
      to: testRecipient,
      replyTo: replyToEmail || gmailAddress,
      subject: '✔ Gmail SMTP Integration Test Successful - Koseli Xpress',
      html: `
        <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; margin: auto; background-color: #fafafa;">
          <h2 style="color: #d11252; margin-top: 0;">SMTP Test Successful!</h2>
          <p>This email confirms that your Gmail App Password and credentials have been configured and verified successfully on <strong>Koseli Xpress</strong>.</p>
          <div style="padding: 12px; background-color: #e2e8f0; border-radius: 6px; font-size: 11px; font-family: monospace;">
            Sender Account: ${gmailAddress}<br/>
            Timestamp: ${new Date().toISOString()}<br/>
            Engine: Node Mailer SMTP Link
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0; margin-top: 16px;">This was an automated developer alignment check. You can safe delete this letter.</p>
        </div>
      `,
    };

    console.log(`Delivering verification test email from "${gmailAddress}" to "${testRecipient}"...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Test email delivered: ', info.messageId);

    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('SMTP test failure:', error);
    res.status(500).json({ error: error.message || 'SMTP Authentication or Network Transmission Error. Please confirm you are using a 16-character Gmail App Password key instead of standard accounts passwords.' });
  }
});

// Automated Order/Status Transaction Email Dispatcher
app.post('/api/mail/send', async (req, res) => {
  const { smtpSettings, template, placeholders, recipientEmail } = req.body;

  if (!smtpSettings || !smtpSettings.gmailAddress || !smtpSettings.appPassword) {
    return res.status(400).json({ error: 'Mail dispatch cancelled: SMTP credentials are not configured or are currently disabled inside the admin workspace.' });
  }

  if (!recipientEmail) {
    return res.status(400).json({ error: 'Recipient address is empty' });
  }

  try {
    // 1. Setup transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpSettings.gmailAddress,
        pass: smtpSettings.appPassword,
      },
    });

    // 2. Format template placeholders
    let formattedSubject = template.subject || 'Order Update Notification';
    let formattedBody = template.body || '';

    if (placeholders) {
      Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        formattedSubject = formattedSubject.replace(regex, String(value || ''));
        formattedBody = formattedBody.replace(regex, String(value || ''));
      });
    }

    // 3. Dispatch parameters
    const mailOptions = {
      from: `"${smtpSettings.senderName || 'Koseli Xpress'}" <${smtpSettings.gmailAddress}>`,
      to: recipientEmail,
      cc: smtpSettings.notificationEmail || undefined,
      replyTo: smtpSettings.replyToEmail || smtpSettings.gmailAddress,
      subject: formattedSubject,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 650px; margin: auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
          ${template.logo ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${template.logo}" style="max-height: 50px;" alt="Logo"/></div>` : ''}
          <div style="background-color: #ffffff; padding: 10px 15px; border-radius: 8px;">
            ${formattedBody}
          </div>
          ${template.footer ? `<div style="margin-top: 30px; font-size: 11px; text-align: center; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 15px;">${template.footer}</div>` : ''}
        </div>
      `,
    };

    console.log(`Sending automated "${template.name || 'Notice'}" to "${recipientEmail}"...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Automated transactional email dispatched: ', info.messageId);

    res.json({ success: true, messageId: info.messageId, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Mail dispatch transmission failure:', error);
    res.status(500).json({ error: error.message || 'SMTP Transmission Fail' });
  }
});

// ==========================================
// DYNAMIC AI CUSTOMER SUPPORT CHAT ENDPOINT
// ==========================================
app.post('/api/ai-chat', async (req, res) => {
  const { messages, whatsappNumber } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages parameter.' });
  }

  const activeWhatsapp = whatsappNumber || '+977 9851012345';

  try {
    // Collect active products for grounding with ID mapping
    const productsContext = (syncedCatalog.products || [])
      .filter((p: any) => p.status === 'ACTIVE' || p.status === 'Active' || !p.status)
      .slice(0, 20)
      .map((p: any) => `- ${p.name} (ID: "${p.id}", Price: NPR ${p.price}): ${p.description || ''}`)
      .join('\n');

    const systemPrompt = `You are CSR- AI, the elegant, sophisticated, polite, and helpful AI Customer Support Agent for **Koseli Xpress**, Nepal's premium e-commerce gift platform.

CRITICAL BEHAVIOR: EXTREMELY BRIEF & POLITE
- You must under all circumstances keep your answers extremely brief, concise, and highly polite.
- ABSOLUTELY MAX 1-2 SENTENCES per reply. Never output lengthy explanations, outlines, lists, or long paragraphs!
- Get straight to the point in 1 or 2 polite sentences with maximum warmth and premium customer support etiquette.
- Always use polite gestures and expressions (such as "Namaste", "Sure, absolutely!", "With pleasure!", "It would be our honor").

MULTI-LANGUAGE & REPLY-IN-KIND REQUIREMENT:
- You support and understand English, Nepali (नेपाली), Hindi (हिंदी), and are capable of communicating in any customer-specific language.
- ALWAYS REPLY IN THE SAME LANGUAGE AS THE CUSTOMER. If they ask in Nepali, reply in Nepali. If they ask in Hindi, reply in Hindi. If they ask in any other language, reply in that exact language.
- Keep the tone polite, premium, and culturally tailored for that language (e.g. use respectful terms like "🙏 नमस्ते", "जी", etc.).

NOT UNDERSTANDING & HUMAN SUPPORT HANDOFF (CRITICAL):
- If you do not understand a question, do not have confidence in the details, or are asked complex/unrelated questions, you MUST IMMEDIATELY hand off the customer to our human support team.
- To hand off to human support, you MUST include the verbatim tag [whatsapp-link] in your message so they can connect with a live assistant instantly.
- Example handoff message: "I'm sorry, I couldn't quite understand your request. Please connect with our human support manager on WhatsApp here: [whatsapp-link]" or "म तपाईंको प्रश्न स्पष्टसँग बुझ्न सकिन। कृपया व्हाट्सएपमा हाम्रो मानव ग्राहक सहायता टोलीसँग जोडिनुहोस्: [whatsapp-link]"

Core Store Policies:
- Delivery within Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur) in 3-4 hours.
- Cakes must be ordered before 1:00 PM for same-day delivery.
- Supports international cards (Visa, MasterCard, Amex) and local wallets (eSewa, Khalti).

Active Product Catalog:
${productsContext || '- 12 Red Roses Premium Round Basket (ID: "p1", Price: NPR 1500)\n- Boutique Chocolate Truffle Cake (1 Lbs) (ID: "p2", Price: NPR 1800)'}

Taking Orders & Instantly Accepting Payments:
If someone is buying or paying for any product:
1. Reassure them politely in 1 short sentence.
2. You MUST append this exact tag at the end: [instant-checkout:PRODUCT_ID]
Example: "Certainly! I have generated your secure order right here. Please tap the payment card below to complete checkout: [instant-checkout:p2]"`;

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || 'I am here to help you design the perfect gift hamper. Please let me know how I can assist you!' });
  } catch (err: any) {
    console.error('Gemini Customer Support AI error:', err);
    res.status(500).json({ error: 'Failed to seek counsel from AI assistant.' });
  }
});

// ==========================================
// API INTEGRATION QUEUE SYSTEM ENDPOINTS
// ==========================================

// Retrieve integrated API users, logs, and payment configurations
app.get('/api/integrate/data', async (req, res) => {
  const store = await getApiStore();
  res.json(store);
});

// Update integrated API users, logs, and payment settings
app.post('/api/integrate/save', async (req, res) => {
  const { users, logs, apiOrders, manualPaymentSetup } = req.body;
  const store = await getApiStore();
  if (users !== undefined) store.users = users;
  if (logs !== undefined) store.logs = logs;
  if (apiOrders !== undefined) store.apiOrders = apiOrders;
  if (manualPaymentSetup !== undefined) store.manualPaymentSetup = manualPaymentSetup;
  await saveApiStore(store);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// Synchronize frontend product catalog, currency, and coupons on backend restart or load
app.post('/api/integrate/sync-catalog', (req, res) => {
  const { products, deliveryDistricts, coupons, serviceFees } = req.body;
  syncedCatalog = {
    products: products || [],
    deliveryDistricts: deliveryDistricts || [],
    coupons: coupons || [],
    serviceFees: serviceFees || []
  };
  res.json({ success: true, count: syncedCatalog.products.length });
});

// GET PRODUCTS API: Fetch whitelisted product catalog with live prices for B2B API Partners
app.get('/api/v1/products', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.query.api_key;
  const apiSecret = req.headers['x-api-secret'] || req.headers['X-API-Secret'] || req.query.api_secret;
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '127.0.0.1';

  const db = await getApiStore();

  const apiLog: any = {
    id: 'log-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toISOString(),
    username: 'unknown',
    endpoint: 'GET /api/v1/products',
    ipAddress: String(ip),
    requestPayload: JSON.stringify({ query: req.query }),
    responseStatus: 200,
    responseBody: '',
    status: 'error'
  };

  const logAndResponse = async (status: number, body: any) => {
    apiLog.responseStatus = status;
    apiLog.responseBody = JSON.stringify(body);
    apiLog.status = (status >= 200 && status < 300) ? 'success' : 'error';
    db.logs.unshift(apiLog);
    if (db.logs.length > 500) db.logs.pop();
    await saveApiStore(db);
    return res.status(status).json(body);
  };

  if (!apiKey || !apiSecret) {
    return logAndResponse(401, { error: 'Authentication required. Missing x-api-key or x-api-secret headers or api_key / api_secret query params.' });
  }

  const user = db.users.find((u: any) => u.apiKey === apiKey && u.apiSecret === apiSecret);
  if (!user) {
    return logAndResponse(401, { error: 'Access Denied: Invalid B2B API credentials.' });
  }

  apiLog.username = user.username;

  if (user.status !== 'active') {
    return logAndResponse(403, { error: 'Authorization Blocked: This integrated API credential is disabled.' });
  }

  // Filter whitelisted products
  const whitelistedProducts = user.allowedProducts && user.allowedProducts.length > 0 
    ? syncedCatalog.products.filter((p: any) => user.allowedProducts.includes(p.id) || user.allowedProducts.includes(p.sku))
    : syncedCatalog.products;

  // Format response details dynamically to return precise updated pricing attributes 
  const formattedProducts = whitelistedProducts.map((p: any) => {
    const basePrice = p.price || 0;
    const discountPrice = p.discountPrice || 0;
    const currentPrice = discountPrice > 0 ? discountPrice : basePrice;

    return {
      id: p.id,
      sku: p.sku || p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      images: p.images || (p.image ? [p.image] : []),
      price: basePrice,
      discountPrice: discountPrice,
      currentPrice: currentPrice,
      currency: "NPR",
      rating: p.rating || 5,
      stockCount: p.stockCount !== undefined ? p.stockCount : 100,
      variations: p.variations || []
    };
  });

  return logAndResponse(200, {
    success: true,
    partner: user.integrationName,
    partner_username: user.username,
    currency: "NPR",
    updated_at: new Date().toISOString(),
    total_products: formattedProducts.length,
    products: formattedProducts
  });
});

// CHECK PRICE API: Dynamic price check and invoice previews for B2B API Partners
app.post('/api/v1/check-price', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.query.api_key;
  const apiSecret = req.headers['x-api-secret'] || req.headers['X-API-Secret'] || req.query.api_secret;
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '127.0.0.1';

  const db = await getApiStore();
  const apiLog: any = {
    id: 'log-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toISOString(),
    username: 'unknown',
    endpoint: 'POST /api/v1/check-price',
    ipAddress: String(ip),
    requestPayload: JSON.stringify(req.body),
    responseStatus: 200,
    responseBody: '',
    status: 'error'
  };

  const logAndResponse = async (status: number, body: any) => {
    apiLog.responseStatus = status;
    apiLog.responseBody = JSON.stringify(body);
    apiLog.status = (status >= 200 && status < 300) ? 'success' : 'error';
    db.logs.unshift(apiLog);
    if (db.logs.length > 500) db.logs.pop();
    await saveApiStore(db);
    return res.status(status).json(body);
  };

  if (!apiKey || !apiSecret) {
    return logAndResponse(401, { error: 'Authentication required. Missing x-api-key or x-api-secret.' });
  }

  const user = db.users.find((u: any) => u.apiKey === apiKey && u.apiSecret === apiSecret);
  if (!user) {
    return logAndResponse(401, { error: 'Access Denied: Invalid integration keys.' });
  }

  apiLog.username = user.username;

  if (user.status !== 'active') {
    return logAndResponse(403, { error: 'Authorization Blocked: This integrated API credential has been disabled.' });
  }

  const reqItems = req.body.items;
  if (!reqItems || !Array.isArray(reqItems) || reqItems.length === 0) {
    return logAndResponse(400, { error: 'Invalid Request: Include an array of "items" with product_id and quantity.' });
  }

  const validatedItems = [];
  let subtotal = 0;

  for (const item of reqItems) {
    const productId = item.product_id;
    const qty = parseInt(item.quantity, 10) || 1;

    if (!productId) {
      return logAndResponse(400, { error: 'Line item product_id parameter is required.' });
    }

    if (user.allowedProducts && user.allowedProducts.length > 0) {
      const isAllowedProd = user.allowedProducts.includes(productId);
      if (!isAllowedProd) {
        return logAndResponse(403, { error: `Access Violation: Product ID '${productId}' is restricted under this integration context.` });
      }
    }

    const catalogProd = syncedCatalog.products.find((p: any) => p.id === productId || p.sku === productId);
    if (!catalogProd) {
      return logAndResponse(404, { error: `Product Fulfillment Error: Product key '${productId}' was not found in our catalog registry.` });
    }

    const priceUnit = catalogProd.discountPrice !== undefined && catalogProd.discountPrice > 0 ? catalogProd.discountPrice : catalogProd.price;
    let finalItemPrice = priceUnit;
    const matchedVariations = [];

    if (item.variations && Array.isArray(item.variations)) {
      for (const reqVar of item.variations) {
        const catalogVar = catalogProd.variations?.find((v: any) => v.name.toLowerCase() === reqVar.name.toLowerCase());
        const catalogOpt = catalogVar?.options?.find((o: any) => o.value.toLowerCase() === reqVar.value.toLowerCase());
        if (catalogOpt) {
          finalItemPrice += catalogOpt.priceAdjustment;
          matchedVariations.push({
            name: catalogVar.name,
            value: catalogOpt.value,
            priceAdjustment: catalogOpt.priceAdjustment
          });
        }
      }
    }

    subtotal += finalItemPrice * qty;

    validatedItems.push({
      product_id: catalogProd.id,
      sku: catalogProd.sku || catalogProd.id,
      name: catalogProd.name,
      quantity: qty,
      unit_price: finalItemPrice,
      total_price: finalItemPrice * qty,
      variations: matchedVariations
    });
  }

  let discountAmount = 0;
  const couponCode = req.body.coupon || (req.body.additional && req.body.additional.coupon);
  if (couponCode) {
    const couponMatch = syncedCatalog.coupons.find((c: any) => c.code.toUpperCase() === String(couponCode).toUpperCase() && c.isActive);
    if (couponMatch) {
      if (subtotal >= couponMatch.minOrderValue) {
        if (couponMatch.discountType === 'percentage') {
          discountAmount = (subtotal * couponMatch.value) / 100;
        } else {
          discountAmount = couponMatch.value;
        }
      }
    }
  }

  let serviceFeeAmount = 0;
  const selectedAddons = req.body.service_addons || (req.body.additional && req.body.additional.service_addons);
  if (selectedAddons && Array.isArray(selectedAddons)) {
    selectedAddons.forEach((addonId: string) => {
      const fee = syncedCatalog.serviceFees.find((f: any) => f.id === addonId && f.isActive);
      if (fee) {
        serviceFeeAmount += fee.feeAmountNPR;
      }
    });
  }

  let deliveryCharge = 0;
  const deliveryCity = req.body.delivery_city;
  if (deliveryCity) {
    const districtMatch = syncedCatalog.deliveryDistricts.find((d: any) => 
      d.name.toLowerCase().trim() === String(deliveryCity).toLowerCase().trim() || 
      d.id.toLowerCase().trim() === String(deliveryCity).toLowerCase().trim()
    );
    if (districtMatch) {
      deliveryCharge = districtMatch.chargeNPR;
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + serviceFeeAmount + deliveryCharge);

  return logAndResponse(200, {
    success: true,
    currency: 'NPR',
    calculation: {
      subtotal,
      discount_amount: discountAmount,
      service_fee_amount: serviceFeeAmount,
      delivery_charge: deliveryCharge,
      grand_total: grandTotal,
    },
    items: validatedItems
  });
});

// SUBMIT ORDER API: Main external gateway for third-party systems
app.post('/api/v1/orders', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  const apiSecret = req.headers['x-api-secret'] || req.headers['X-API-Secret'];
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '127.0.0.1';

  const defaultFields = [
    'sender_name', 'sender_email', 'sender_mobile',
    'receiver_name', 'receiver_mobile',
    'delivery_address', 'delivery_city',
    'delivery_date', 'delivery_slot', 'gift_message', 'occasion', 'instructions',
    'service_addons', 'coupon', 'internal_notes'
  ];

  const db = await getApiStore();
  const apiLog: any = {
    id: 'log-' + Math.floor(100000 + Math.random() * 900000),
    timestamp: new Date().toISOString(),
    username: 'unknown',
    endpoint: 'POST /api/v1/orders',
    ipAddress: String(ip),
    requestPayload: JSON.stringify(req.body),
    responseStatus: 200,
    responseBody: '',
    status: 'error'
  };

  const logAndResponse = async (status: number, body: any) => {
    apiLog.responseStatus = status;
    apiLog.responseBody = JSON.stringify(body);
    apiLog.status = (status >= 200 && status < 300) ? 'success' : 'error';
    db.logs.unshift(apiLog);
    if (db.logs.length > 500) db.logs.pop();
    await saveApiStore(db);
    return res.status(status).json(body);
  };

  // 1. Authenticate API Key & Secret
  if (!apiKey || !apiSecret) {
    return logAndResponse(401, { error: 'Authentication required. Missing x-api-key or x-api-secret headers.' });
  }

  const user = db.users.find((u: any) => u.apiKey === apiKey && u.apiSecret === apiSecret);
  if (!user) {
    return logAndResponse(401, { error: 'Access Denied: Invalid x-api-key or x-api-secret.' });
  }

  apiLog.username = user.username;

  // 1b. Validate IP address security whitelist
  if (user.allowedIps && user.allowedIps.trim() !== '') {
    const clientIps = String(ip).split(',').map(item => item.trim());
    const allowedList = user.allowedIps.split(',').map(item => item.trim()).filter(Boolean);
    
    // Check if any client IP is inside the whitelisted list
    const isIpAllowed = clientIps.some(clientIp => allowedList.includes(clientIp)) || 
                        allowedList.includes('*') || 
                        allowedList.includes('any');

    if (!isIpAllowed) {
      return logAndResponse(403, { 
        error: `Security Access Blocked: Your calling IP Address (${clientIps[0]}) is not whitelisted for this integration credential. Please contact Koseli Super Admin to authorize your network address.` 
      });
    }
  }

  // Check if API User is enabled
  if (user.status !== 'active') {
    return logAndResponse(403, { error: 'Authorization Blocked: This integrated API credential has been disabled.' });
  }

  // 2. Validate Dynamic Fields Behavior
  const fieldConfigs = user.fieldConfig || {};
  
  const senderObj = req.body.sender || {};
  const receiverObj = req.body.receiver || {};
  const orderObj = req.body.order || {};
  const addObj = req.body.additional || {};

  const values: Record<string, any> = {
    sender_name: senderObj.name,
    sender_email: senderObj.email,
    sender_mobile: senderObj.mobile,
    receiver_name: receiverObj.name,
    receiver_mobile: receiverObj.mobile,
    delivery_address: req.body.delivery_address,
    delivery_city: req.body.delivery_city,
    delivery_date: orderObj.delivery_date,
    delivery_slot: orderObj.delivery_slot,
    gift_message: orderObj.gift_message,
    occasion: orderObj.occasion,
    instructions: orderObj.instructions,
    service_addons: addObj.service_addons,
    coupon: addObj.coupon,
    internal_notes: addObj.internal_notes
  };

  // Field validation against user settings
  for (const field of defaultFields) {
    const config = fieldConfigs[field] || { enabled: true, mandatory: false };
    if (!config.enabled) {
      values[field] = undefined; // clear disabled fields
    } else if (config.mandatory) {
      const val = values[field];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        return logAndResponse(400, { error: `Required Field Missing: ${field} is configured as mandatory for this integration.` });
      }
    }
  }

  // 3. Currency Validation (NPR check)
  if (req.body.currency && req.body.currency.toUpperCase() !== 'NPR') {
    return logAndResponse(400, { error: 'Unsupported Currency: This API portal exclusively trades in Nepalese Rupees (NPR).' });
  }

  // 4. Validate Location Restriction
  const deliveryCity = values.delivery_city;
  if (deliveryCity) {
    if (user.allowedCities && user.allowedCities.length > 0) {
      const isAllowed = user.allowedCities.some((city: string) => city.toLowerCase().trim() === String(deliveryCity).toLowerCase().trim());
      if (!isAllowed) {
        return logAndResponse(403, { error: `Product Fulfilment Error: Delivery to city / district '${deliveryCity}' is not in your allowed location scope.` });
      }
    }
  }

  // 5. Validate Product Restrictions
  const reqItems = req.body.items;
  if (!reqItems || !Array.isArray(reqItems) || reqItems.length === 0) {
    return logAndResponse(400, { error: 'Invalid Order: Order must contain at least one item under the "items" definition.' });
  }

  const validatedItems = [];
  let subtotal = 0;

  for (const item of reqItems) {
    const productId = item.product_id;
    const qty = parseInt(item.quantity, 10) || 1;

    if (!productId) {
      return logAndResponse(400, { error: 'Line item product_id parameter is required.' });
    }

    // Check if product is in allowed list
    if (user.allowedProducts && user.allowedProducts.length > 0) {
      const isAllowedProd = user.allowedProducts.includes(productId);
      if (!isAllowedProd) {
        return logAndResponse(403, { error: `Access Violation: Product ID '${productId}' is restricted under this integration context.` });
      }
    }

    // Lookup in synced active catalog
    const catalogProd = syncedCatalog.products.find((p: any) => p.id === productId || p.sku === productId);
    if (!catalogProd) {
      return logAndResponse(404, { error: `Product Fulfillment Error: Product key '${productId}' was not found in our catalog registry.` });
    }

    const priceUnit = catalogProd.discountPrice !== undefined && catalogProd.discountPrice > 0 ? catalogProd.discountPrice : catalogProd.price;
    let finalItemPrice = priceUnit;
    const matchedVariations = [];

    if (item.variations && Array.isArray(item.variations)) {
      for (const reqVar of item.variations) {
        const catalogVar = catalogProd.variations?.find((v: any) => v.name.toLowerCase() === reqVar.name.toLowerCase());
        const catalogOpt = catalogVar?.options?.find((o: any) => o.value.toLowerCase() === reqVar.value.toLowerCase());
        if (catalogOpt) {
          finalItemPrice += catalogOpt.priceAdjustment;
          matchedVariations.push({
            name: catalogVar.name,
            value: catalogOpt.value,
            priceAdjustment: catalogOpt.priceAdjustment
          });
        }
      }
    }

    subtotal += finalItemPrice * qty;

    validatedItems.push({
      productId: catalogProd.id,
      quantity: qty,
      selectedPrice: finalItemPrice,
      productName: catalogProd.name,
      customMessage: values.gift_message || undefined,
      selectedVariations: matchedVariations
    });
  }

  // 6. Calculate Coupon Rules
  let discountAmount = 0;
  const couponCode = values.coupon;
  if (couponCode) {
    const couponMatch = syncedCatalog.coupons.find((c: any) => c.code.toUpperCase() === String(couponCode).toUpperCase() && c.isActive);
    if (couponMatch) {
      if (subtotal >= couponMatch.minOrderValue) {
        if (couponMatch.discountType === 'percentage') {
          discountAmount = (subtotal * couponMatch.value) / 100;
        } else {
          discountAmount = couponMatch.value;
        }
      }
    }
  }

  // 7. Calculate Service Fees
  let serviceFeeAmount = 0;
  let serviceFeeName = null;
  const selectedAddons = values.service_addons;
  if (selectedAddons && Array.isArray(selectedAddons)) {
    const feeNames: string[] = [];
    selectedAddons.forEach((addonId: string) => {
      const fee = syncedCatalog.serviceFees.find((f: any) => f.id === addonId && f.isActive);
      if (fee) {
        serviceFeeAmount += fee.feeAmountNPR;
        feeNames.push(fee.name);
      }
    });
    if (feeNames.length > 0) {
      serviceFeeName = feeNames.join(', ');
    }
  }

  // 8. Calculate Delivery charge
  let deliveryCharge = 0;
  if (deliveryCity) {
    const districtMatch = syncedCatalog.deliveryDistricts.find((d: any) => 
      d.name.toLowerCase().trim() === String(deliveryCity).toLowerCase().trim() || 
      d.id.toLowerCase().trim() === String(deliveryCity).toLowerCase().trim()
    );
    if (districtMatch) {
      deliveryCharge = districtMatch.chargeNPR;
    }
  }

  // Final order pricing total
  const grandTotal = Math.max(0, subtotal - discountAmount + serviceFeeAmount + deliveryCharge);

  // 9. Create API Order model
  const orderId = 'ord-api-' + Math.floor(100000 + Date.now() % 100000);
  const refId = 'KO-API-' + Math.floor(100000 + Math.random() * 900000);
  const trackingUrl = `/?view=track&ref=${refId}`;

  const newOrder: any = {
    id: orderId,
    refId: refId,
    apiPartnerId: user.id,
    apiPartnerUsername: user.username,
    customerName: values.sender_name || 'API Partner',
    customerEmail: values.sender_email || user.email,
    customerPhone: values.sender_mobile || '+9779800000000',
    shippingAddress: values.delivery_address || 'As specified',
    senderName: values.sender_name,
    senderEmail: values.sender_email,
    senderPhone: values.sender_mobile,
    receiverName: values.receiver_name,
    receiverPhone: values.receiver_mobile,
    deliveryDistrict: String(deliveryCity || ''),
    deliveryAddress: values.delivery_address,
    orderNote: `API placed order. Occasion: ${values.occasion || 'None'}. Gift message: ${values.gift_message || 'None'}. Special Instructions: ${values.instructions || 'None'}. Internal Notes: ${values.internal_notes || ''}`,
    preferredDeliveryDate: values.delivery_date,
    deliveryChargeAmount: deliveryCharge,
    items: validatedItems,
    additionalServiceFeeAdded: serviceFeeName,
    additionalServiceFeeAmount: serviceFeeAmount,
    currency: 'NPR',
    exchangeRate: 1.0,
    totalAmount: grandTotal,
    totalAmountBase: grandTotal,
    couponCodeUsed: couponCode,
    paymentMethod: 'Manual Bank Transfer / QR Pay',
    status: 'pending',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    selectedTimeSlot: values.delivery_slot,
    timeSlotChargeAmount: 0
  };

  // Add to integrated system order list
  db.apiOrders.unshift(newOrder);
  await saveApiStore(db);

  // Attempt to deliver SMTP email if mail credentials available
  try {
    const rootDb = await getAppState();
    if (rootDb) {
      const smtp = (rootDb as any).smtpSettings;
      if (smtp && smtp.isEnabled && smtp.gmailAddress && smtp.appPassword) {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: smtp.gmailAddress,
            pass: smtp.appPassword,
          },
        });

        // Dynamic SMTP email alert with instructions 
        const instructionsText = db.manualPaymentSetup.instructions;
        const mailOptions = {
          from: `"${smtp.senderName || 'Koseli Xpress'}" <${smtp.gmailAddress}>`,
          to: newOrder.customerEmail,
          subject: `✔ Order Submitted (Pending Payment) - Ref: ${refId}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b; max-width: 650px; margin: auto; padding: 20px; border: 1px solid #f1f5f9; border-radius: 12px;">
              <h2 style="color: #d11252; margin-top: 0;">Namaste !!</h2>
              <p>We have received your automated order submission. Thank you for choosing Koseli Xpress.</p>
              <p><strong>Order Tracking Reference:</strong> <code style="background-color:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:bold;">${refId}</code></p>
              
              <div style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-top: 15px;">
                <h3 style="color: #492583; margin-top: 0;">Payment Settlement Required</h3>
                <p style="font-size: 13px; color: #475569;">To approve and dispatch this request, please clear the NPR amount below using Bank Transfer or QR Pay:</p>
                <div style="padding: 12px; border-left: 4px solid #d11252; background-color: #e2e8f0; font-size: 13px; font-family: monospace; line-height: 1.6;">
                  <strong>Bank:</strong> ${db.manualPaymentSetup.bankName}<br/>
                  <strong>Account Name:</strong> ${db.manualPaymentSetup.accountName}<br/>
                  <strong>Account Number:</strong> ${db.manualPaymentSetup.accountNumber}<br/>
                  <strong>Amount to Settle:</strong> NPR ${grandTotal.toLocaleString()}<br/>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 10px;">${instructionsText}</p>
                ${db.manualPaymentSetup.whatsAppNumber ? `<p style="font-size: 12px; color: #64748b; margin-top: 6px;">WhatsApp Support: ${db.manualPaymentSetup.whatsAppNumber}</p>` : ''}
              </div>
            </div>
          `
        };
        await transporter.sendMail(mailOptions);
        console.log(`SMTP Confirmation sent for API order ${refId}`);
      }
    }
  } catch (ex) {
    // Graceful catch for SMTP logging
    console.log('API SMTP order dispatch warning: root DB mail credentials missing or not configured yet.');
  }

  // Return formatted JSON
  return logAndResponse(201, {
    success: true,
    message: 'API Order created successfully. Pending payment confirmation.',
    order_id: orderId,
    tracking_ref: refId,
    tracking_url: trackingUrl,
    total_amount_npr: grandTotal,
    payment_method: 'Manual Payment',
    payment_status: 'Pending Payment',
    payment_instructions: {
      bank_name: db.manualPaymentSetup.bankName,
      account_name: db.manualPaymentSetup.accountName,
      account_number: db.manualPaymentSetup.accountNumber,
      qr_code: db.manualPaymentSetup.qrCode,
      instructions: db.manualPaymentSetup.instructions,
      whats_app: db.manualPaymentSetup.whatsAppNumber
    },
    order_details: {
      items_count: validatedItems.length,
      subtotal_npr: subtotal,
      delivery_charge_npr: deliveryCharge,
      service_fee_npr: serviceFeeAmount,
      discount_coupon_npr: discountAmount,
      grand_total_npr: grandTotal
    }
  });
});

async function start() {
  const mongoConnected = await connectDB();
  if (mongoConnected) {
    await syncLocalAppStateToMongo();
    await seedSuperAdmin();
  } else {
    console.warn('[Startup] Skipping MongoDB-only super admin seed while running in offline local-store mode.');
  }
  await seedPaymentGatewaysFromEnv();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Koseli Xpress API running at http://0.0.0.0:${PORT}${mongoConnected ? '' : ' (offline local-store mode)'}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Koseli Xpress API port ${PORT} is already in use. Keeping the existing server running.`);
      return;
    }
    throw err;
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
