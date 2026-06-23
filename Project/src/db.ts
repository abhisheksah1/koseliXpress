import { DatabaseState, Product, ProductStatus, OrderStatus, Order, Lead, LeadStatus, Role, VisitorTrack } from './types';

export function generateSeedVisitors(): VisitorTrack[] {
  const visitors: VisitorTrack[] = [];
  const countries = [
    { name: 'Nepal', code: 'NP', weight: 55 },
    { name: 'United States', code: 'US', weight: 15 },
    { name: 'India', code: 'IN', weight: 15 },
    { name: 'Australia', code: 'AU', weight: 6 },
    { name: 'United Kingdom', code: 'GB', weight: 5 },
    { name: 'Japan', code: 'JP', weight: 4 },
  ];
  
  const browsers = [
    { name: 'Chrome', weight: 60 },
    { name: 'Safari', weight: 25 },
    { name: 'Firefox', weight: 8 },
    { name: 'Edge', weight: 7 },
  ];

  const devices: ('Mobile' | 'Desktop' | 'Tablet')[] = ['Mobile', 'Mobile', 'Desktop', 'Mobile', 'Tablet'];

  const pages = [
    { slug: 'home', title: 'Home Storefront', weight: 45 },
    { slug: 'category/cakes', title: 'Premium Cakes', weight: 15 },
    { slug: 'category/flowers', title: 'Fresh Flowers', weight: 15 },
    { slug: 'category/gift-hampers', title: 'Gift Hampers Catalog', weight: 15 },
    { slug: 'product/deluxe-rose-box', title: 'Deluxe Red Rose Premium Box', weight: 10 },
  ];

  const getRandomItemByWeight = (items: any[]) => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const item of items) {
      if (rand < item.weight) return item;
      rand -= item.weight;
    }
    return items[0];
  };

  const now = new Date();
  let trackId = 1001;

  for (let d = 9; d >= 0; d--) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() - d);
    const dailyCount = 18 + Math.floor(Math.sin((targetDate.getDate()) * 0.5) * 8) + Math.floor(Math.random() * 8);
    
    for (let c = 0; c < dailyCount; c++) {
      const countrySelected = getRandomItemByWeight(countries);
      const browserSelected = getRandomItemByWeight(browsers);
      const pageSelected = getRandomItemByWeight(pages);
      const deviceSelected = devices[Math.floor(Math.random() * devices.length)];
      
      let hour = 8 + Math.floor(Math.random() * 15);
      if (Math.random() < 0.2) {
        hour = Math.floor(Math.random() * 24);
      }
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const sessionDate = new Date(targetDate);
      sessionDate.setHours(hour, minute, second, 0);
      
      let os = 'Windows';
      if (deviceSelected === 'Mobile' || deviceSelected === 'Tablet') {
        os = Math.random() < 0.6 ? 'Android' : 'iOS';
      } else {
        os = Math.random() < 0.5 ? 'Windows' : (Math.random() < 0.7 ? 'macOS' : 'Linux');
      }

      visitors.push({
        id: `vt-${trackId++}`,
        ip: `${Math.floor(Math.random() * 210) + 10}.${Math.floor(Math.random() * 190) + 12}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`,
        country: countrySelected.name,
        countryCode: countrySelected.code,
        timestamp: sessionDate.toISOString(),
        pageSlug: pageSelected.slug,
        pageTitle: pageSelected.title,
        browser: browserSelected.name,
        os: os,
        device: deviceSelected,
        duration: 10 + Math.floor(Math.random() * 240)
      });
    }
  }
  
  return visitors.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

const INITIAL_STATE: DatabaseState = {
  users: [
    { email: 'dinesh.dineshchalise@gmail.com', role: Role.ADMIN, invitedAt: '2026-05-15T12:00:00Z', passcode: '9841', fullName: 'Dinesh Chalise', username: 'dinesh', password: 'Dinesh@superadmin123', mobile: '+9779841234567', status: 'active' },
    { email: 'staff1@koseli.com', role: Role.MANAGER, invitedAt: '2026-05-20T08:30:00Z', passcode: '5432', fullName: 'Staff One', username: 'staff1', password: 'password5432', mobile: '+9779800000001', status: 'active' }
  ],
  rolePermissions: {
    [Role.ADMIN]: { orderProcess: true, accounts: true, productEdit: true, purchaseEntry: true, systemSettings: true },
    [Role.MANAGER]: { orderProcess: true, accounts: false, productEdit: true, purchaseEntry: true, systemSettings: false },
    [Role.STAFF]: { orderProcess: true, accounts: false, productEdit: false, purchaseEntry: false, systemSettings: false }
  },
  categories: [
    {
      id: 'cat-flowers',
      name: 'Fresh Flowers',
      slug: 'fresh-flowers',
      description: 'Hand-picked premium roses, lilies, orchids, and custom wraps.',
      image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop',
      metaTitle: 'Buy Fresh Flower Bunches Online in Nepal - Koseli Xpress',
      metaDescription: 'Order beautiful hand-tied red roses, beautiful lilies & flower bouquets for shipping in Kathmandu and other cities.',
      metaKeywords: 'flowers, red roses, anniversary bouquet, kathmandu delivery'
    },
    {
      id: 'cat-cakes',
      name: 'Gourmet Cakes',
      slug: 'gourmet-cakes',
      description: 'Delicious premium cakes baked fresh daily from partner boutiques.',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=600&auto=format&fit=crop',
      metaTitle: 'Premium Birthday & Anniversary Cakes Online | Koseli Xpress',
      metaDescription: 'Bespoke custom cakes. Choose from Chocolate Truffle, White Forest, Red Velvet, and more with instant dispatch.',
      metaKeywords: 'cakes, chocolate truffle, birthday cake, anniversary gift'
    },
    {
      id: 'cat-chocolates',
      name: 'Luxury Chocolates',
      slug: 'luxury-chocolates',
      description: 'Imported chocolates, fine truffles, and sweet assortments.',
      image: 'https://images.unsplash.com/photo-1548907040-4d42b5212c10?q=80&w=600&auto=format&fit=crop',
      metaTitle: 'Imported Luxury Chocolate Gift Packs - Koseli Xpress',
      metaDescription: 'Send delicious Ferrero Rocher, Swiss chocolates, and premium gift boxes to your friends and loved ones in Nepal.',
      metaKeywords: 'chocolates, ferrero rocher, swiss chocolate, gift boxes'
    },
    {
      id: 'cat-hampers',
      name: 'Gift Hampers & Combos',
      slug: 'gift-hampers',
      description: 'Curated premium combos, flower & cake hampers designed to deliver joy.',
      image: 'https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop',
      metaTitle: 'Curated Premium Gift Combos & Hampers | Koseli Xpress',
      metaDescription: 'Save more with our curated celebration hampers. Hand-crafted floral bunched combined with delicious cakes & chocolates.',
      metaKeywords: 'gift hampers, premium combo, gift pack, anniversary hamper'
    }
  ],
  brands: [
    {
      id: 'brand-local',
      name: 'Koseli Artisans',
      slug: 'koseli-artisans',
      description: 'Locally curated, hand-wrapped products by local florists & bakers.',
      logo: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=150&auto=format&fit=crop',
      metaTitle: 'Koseli Artisans Collection | Local Craft Hand-made Gifts',
      metaDescription: 'Sourced supporting local business in Kathmandu valley. High quality standards guaranteed.',
      metaKeywords: 'local artisan, premium florist, boutique bakery'
    },
    {
      id: 'brand-premium',
      name: 'Swiss Royal Chocolatiers',
      slug: 'swiss-royal-chocolates',
      description: 'Fine imported chocolates.',
      logo: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=150&auto=format&fit=crop',
      metaTitle: 'Swiss Royal Imported Chocolates - Koseli Xpress',
      metaDescription: 'Original Swiss-crafted cocoa bars and luxury assorted truffles.',
      metaKeywords: 'swiss chocolate, original lindt, luxury gold ribbon'
    }
  ],
  products: [
    {
      id: 'prod-roses-12',
      name: '12 Red Roses Premium Round Basket',
      slug: '12-roses-round-basket',
      brandId: 'brand-local',
      categoryId: 'cat-flowers',
      description: 'A beautiful arrangement of 12 fresh, farm-direct red roses elegantly decorated with green fillers and wrapped in luxury net craft.',
      images: ['https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?q=80&w=600&auto=format&fit=crop'],
      price: 1500,
      costPrice: 650,
      status: ProductStatus.ACTIVE,
      sku: 'FLW-ROS-012',
      metaTitle: '12 Red Roses Premium Basket Online Order - Koseli Xpress',
      metaDescription: 'Splendid arrangement of 12 fresh red roses. Hand-delivered in elegant wooden round basket.',
      metaKeywords: 'roses basket, fresh red roses, floral gifts',
      stock: 35,
      lowStockThreshold: 5,
      isHamper: false,
      deliveryGroupId: 'grp-ktm',
      deliveryGroupIds: ['grp-ktm'],
      additionalNote: 'Actual flower arrangements might slightly vary in design depending on seasonal rose bud size and florist availability. Rest assured we only dispatch ultra fresh hand-arranged roses!'
    },
    {
      id: 'prod-truffle-1lb',
      name: 'Boutique Chocolate Truffle Cake (1 Lbs)',
      slug: 'boutique-chocolate-truffle-1lb',
      brandId: 'brand-local',
      categoryId: 'cat-cakes',
      description: 'Rich, moist dark chocolate cake layered with premium Belgian ganache. Baked fresh 4 hours prior to delivery.',
      images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=600&auto=format&fit=crop'],
      price: 1800,
      costPrice: 800,
      status: ProductStatus.ACTIVE,
      sku: 'CAK-TRF-001',
      metaTitle: 'Buy Rich Dark Chocolate Truffle Cake 1lbs - Koseli Xpress',
      metaDescription: 'Scrumptious chocolate truffle cake for birthdays and celebrations.',
      metaKeywords: 'chocolate cake, fresh truffle, bday cake',
      stock: 20,
      lowStockThreshold: 4,
      isHamper: false,
      deliveryGroupId: 'grp-ktm',
      deliveryGroupIds: ['grp-ktm'],
      additionalNote: 'Cakes require fresh custom-baked preparation. Orders accepted before 1:00 PM will qualify for same-day evening delivery.'
    },
    {
      id: 'prod-ferrero-16',
      name: 'Ferrero Rocher Rochers Box (16 Pieces)',
      slug: 'ferrero-rocher-16',
      brandId: 'brand-premium',
      categoryId: 'cat-chocolates',
      description: 'Premium absolute delicious hazelnut chocolates in a smart golden pack of 16 chocolate balls.',
      images: ['https://images.unsplash.com/photo-1548907040-4d42b5212c10?q=80&w=340&auto=format&fit=crop'],
      price: 2200,
      costPrice: 1400,
      status: ProductStatus.ACTIVE,
      sku: 'CHO-FER-016',
      metaTitle: 'Ferrero Rocher Luxury Chocolate 16 Pcs Pack - Koseli Xpress',
      metaDescription: 'Crispy chocolate balls with creamy hazelnut filling. Order original imported Ferrero online.',
      metaKeywords: 'ferrero, golden chocolate, hazelnut sweets',
      stock: 40,
      lowStockThreshold: 8,
      isHamper: false,
      deliveryGroupId: 'grp-major',
      deliveryGroupIds: ['grp-major']
    },
    {
      id: 'prod-greeting-card',
      name: 'Elegant Handcrafted Celebration Card',
      slug: 'elegant-handcrafted-card',
      brandId: 'brand-local',
      categoryId: 'cat-chocolates',
      description: 'Customized thick card printed with premium ink. Include your personal message for the recipient.',
      images: ['https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=340&auto=format&fit=crop'],
      price: 300,
      costPrice: 50,
      status: ProductStatus.ACTIVE,
      sku: 'CRD-CEL-001',
      metaTitle: 'Buy Custom Greeting Celebration Cards | Koseli Xpress',
      metaDescription: 'Add a customized personal gesture card and premium note with your delivery box.',
      metaKeywords: 'greeting card, personal writeup, gift card',
      stock: 120,
      lowStockThreshold: 10,
      isHamper: false,
      deliveryGroupId: 'grp-major',
      deliveryGroupIds: ['grp-major']
    },
    // The Combo Hamper which automatically maps to flowers + cake + chocolates
    {
      id: 'prod-hamper-royal',
      name: 'Royal Love & Celebration Combo Hamper',
      slug: 'royal-celebration-combo-hamper',
      brandId: 'brand-local',
      categoryId: 'cat-hampers',
      description: 'The Ultimate Sweet Gesture! Premium combination of: 12 Red Roses basket, Chocolate Truffle Cake (1 Lbs), Ferrero Rocher (16 Pcs) and our Elegant Handcrafted Card containing your words. Highly cost effective bundled option!',
      images: ['https://images.unsplash.com/photo-154946?q=80&w=600&auto=format&fit=crop'],
      price: 5200, // Combo special price! Sum of individual totals: 1500+1800+2200+300 = 5800. Rs. 600 Saved!
      costPrice: 2900,
      status: ProductStatus.ACTIVE,
      sku: 'HMP-ROY-001',
      metaTitle: 'Royal Love Flower, Cake & Ferrero Hamper Collection - Koseli Xpress',
      metaDescription: 'Best combo pack for anniversaries & birthdays. Consists of roses basket, chocolate truffle cake & Ferrero chocolates.',
      metaKeywords: 'combo hamper, roses and cake bundle, royal celebration',
      stock: 20, // dynamically bounded if needed, but we keep a base stock too
      lowStockThreshold: 3,
      isHamper: true,
      deliveryGroupId: 'grp-ktm',
      deliveryGroupIds: ['grp-ktm'],
      hamperItems: [
        { productId: 'prod-roses-12', quantity: 1 },
        { productId: 'prod-truffle-1lb', quantity: 1 },
        { productId: 'prod-ferrero-16', quantity: 1 },
        { productId: 'prod-greeting-card', quantity: 1 }
      ]
    }
  ],
  inventoryLogs: [
    { id: 'log-1', productId: 'prod-roses-12', type: 'in', quantity: 45, reason: 'Initial batch upload', timestamp: '2026-05-15T09:00:00Z' },
    { id: 'log-2', productId: 'prod-roses-12', type: 'out', quantity: 10, reason: 'Dispatched in order refs', timestamp: '2026-05-28T14:30:00Z' },
    { id: 'log-3', productId: 'prod-truffle-1lb', type: 'in', quantity: 20, reason: 'Morning fresh bakery batch', timestamp: '2026-05-31T05:00:00Z' }
  ],
  reviews: [
    { id: 'rev-1', productId: 'prod-roses-12', customerName: 'Roshan Shrestha', rating: 5, comment: 'Absolutely mesmerizing roses! My wife was super happy. On time delivery.', status: 'published', createdAt: '2026-05-28T12:00:00Z' },
    { id: 'rev-2', productId: 'prod-truffle-1lb', customerName: 'Aarati Karki', rating: 4.5, comment: 'The chocolate was rich and very tasty. Highly recommended cake makers.', status: 'published', createdAt: '2026-05-30T16:00:00Z' },
    { id: 'rev-3', productId: 'prod-hamper-royal', customerName: 'Sanjay Thapa', rating: 5, comment: 'Unbelievable value! Ordering the combo saved me so much hassle and money too.', status: 'published', createdAt: '2026-05-29T10:00:00Z' }
  ],
  coupons: [
    { id: 'coupon-welcome', code: 'KOUSELI10', discountType: 'percentage', value: 10, minOrderValue: 2000, expiryDate: '2026-12-31', isActive: true },
    { id: 'coupon-fest', code: 'PROMO500', discountType: 'fixed', value: 500, minOrderValue: 4500, expiryDate: '2026-09-01', isActive: true }
  ],
  leads: [
    {
      id: 'lead-1',
      customerName: 'Samir Acharya',
      customerEmail: 'samir.ach11@gmail.com',
      customerPhone: '9841808090',
      cartItems: [
        { productId: 'prod-roses-12', quantity: 1, selectedPrice: 1500 }
      ],
      additionalServiceFeeAdded: 'Premium Giftbox Packing',
      currency: 'NPR',
      totalAmount: 2500, // 1500 + 1000 service fee
      status: LeadStatus.FAILED,
      createdAt: '2026-05-31T21:40:00Z'
    },
    {
      id: 'lead-2',
      customerName: 'Kriti Adhikari',
      customerEmail: 'kriti.p@outlook.com',
      customerPhone: '9801235123',
      cartItems: [
        { productId: 'prod-hamper-royal', quantity: 1, selectedPrice: 5200 }
      ],
      additionalServiceFeeAdded: null,
      currency: 'INR',
      totalAmount: 3250, // Converted
      status: LeadStatus.FOLLOWED_UP,
      createdAt: '2026-05-31T20:15:00Z'
    }
  ],
  orders: [
    {
      id: 'ord-1001',
      refId: 'KO-1001',
      customerName: 'Dinesh Chalise',
      customerEmail: 'dinesh.chalise@gmail.com',
      customerPhone: '9851012345',
      shippingAddress: 'Lazimpat Rd, Ward-2, Kathmandu, Nepal',
      items: [
        { productId: 'prod-hamper-royal', quantity: 1, selectedPrice: 5200, productName: 'Royal Love & Celebration Combo Hamper' }
      ],
      additionalServiceFeeAdded: 'Premium Wooden Box Wrap',
      additionalServiceFeeAmount: 1000,
      currency: 'NPR',
      exchangeRate: 1.0,
      totalAmount: 6200,
      totalAmountBase: 6200,
      paymentMethod: 'Khalti Wallet',
      status: OrderStatus.SHIPPED,
      createdAt: '2026-05-29T11:45:00Z'
    },
    {
      id: 'ord-1002',
      refId: 'KO-1002',
      customerName: 'Preeti Sharma',
      customerEmail: 'preeti.sharma@inbox.in',
      customerPhone: '919810145230',
      shippingAddress: 'Indian Embassy Security Gate, Lainchaur, Kathmandu',
      items: [
        { productId: 'prod-truffle-1lb', quantity: 1, selectedPrice: 1800, productName: 'Boutique Chocolate Truffle Cake (1 Lbs)' }
      ],
      additionalServiceFeeAdded: null,
      additionalServiceFeeAmount: 0,
      currency: 'INR',
      exchangeRate: 1.6, // 1 INR = 1.6 NPR. 1800 NPR / 1.6 = 1125 INR!
      totalAmount: 1125,
      totalAmountBase: 1800,
      paymentMethod: 'UPI Card System (INR)',
      status: OrderStatus.PENDING,
      createdAt: '2026-05-31T17:20:00Z'
    },
    {
      id: 'ord-79985',
      refId: 'KO--79985',
      customerName: 'Dinesh Chalise',
      customerEmail: 'dinesh.dineshchalise@gmail.com',
      customerPhone: '9851012345',
      shippingAddress: 'Kapan Rd, Ward-12, Budhanilkantha, Kathmandu, Nepal',
      senderName: 'Dinesh Chalise',
      senderEmail: 'dinesh.dineshchalise@gmail.com',
      senderPhone: '9851012345',
      receiverName: 'Aarati Chalise',
      receiverPhone: '9801354452',
      deliveryDistrict: 'Kathmandu Inside Ringroad',
      deliveryAddress: 'House 42, Kapan Rd, Budhanilkantha',
      preferredDeliveryDate: '2026-06-06',
      items: [
        { 
          productId: 'prod-roses-12', 
          quantity: 1, 
          selectedPrice: 1200, 
          productName: 'Fresh Luxury Red Roses (Single Dozen Wrapped)',
          customMessage: 'Happy Personalized Anniversary! | Photo Print Request',
          customImageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?q=80&w=600&auto=format&fit=crop'
        }
      ],
      additionalServiceFeeAdded: 'Premium Wooden Box Wrap',
      additionalServiceFeeAmount: 1000,
      currency: 'NPR',
      exchangeRate: 1.0,
      totalAmount: 2200,
      totalAmountBase: 2200,
      paymentMethod: 'MANUAL',
      status: OrderStatus.PENDING,
      paymentStatus: 'pending',
      createdAt: '2026-06-05T09:12:00Z'
    }
  ],
  currencies: [
    { code: 'NPR', symbol: 'Rs.', rateToNPR: 1.0, isDefault: true },
    { code: 'INR', symbol: '₹', rateToNPR: 1.6, isDefault: false }, // 1 INR = 1.6 NPR
    { code: 'USD', symbol: '$', rateToNPR: 133.5, isDefault: false }, // 1 USD = 133.5 NPR
    { code: 'CAD', symbol: 'C$', rateToNPR: 98.2, isDefault: false } // 1 CAD = 98.2 NPR
  ],
  plugins: {
    whatsappNumber: '+9779851012345',
    whatsappMessage: 'Hi Koseli Xpress, I am looking for updates on my order. Reference code: ',
    googleAnalyticsId: 'G-KOSXPRE99',
    facebookPixelId: 'FB-PIX-9008',
    whatsappIconType: 'whatsapp',
    whatsappCustomSvg: ''
  },
  appearance: {
    themeMode: 'light',
    primaryColor: '#d11252', // Koseli Official Vibrant Magenta Pink
    secondaryColor: '#492583', // Koseli Official Custom Velvet Purple
    siteLogo: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=80&auto=format&fit=crop',
    navbarLinks: [],
    domainName: 'koselixpress.com',
    favImage: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
    slogan: 'मायाको कोसेली',
    stickyNotice: '🚚 Flat 10% OFF on payments made using Visa & Mastercard! Prompt handwrapped delivery across Kathmandu Valley.',
    websiteTextFont: 'poppins',
    shippingNotice: '🚚 Guaranteed delivery inside Kathmandu within 3 hours. Order by 3 PM for same-day dispatch. Personalized hand-signed gift card included.',
    shortTermsAndConditions: '⚠️ Fresh and bespoke handcrafted items. No cancellation or modification allowed after cooking/wrapping preparation starts.',
    fullTermsAndConditions: 'Terms & Conditions:\n1. Handcrafted gift hamper content configurations (e.g. ribbon color, basket material) might vary slightly based on seasonal craft availability.\n2. Scheduled deliveries require at least 3 hours buffer.\n3. Promotional category-specific and gatewaypayment-specific discounts compute automatically during final billing checkout.',
    giftingSlaDisclaimer: '📢 Compliance & Gifting SLA disclaimer: Due to seasonal availability and logistical variables across Nepal, specific wrapping decorations or exact flower/fruit components may be slightly modified to match aesthetic expectations.',
    brandDescriptionStyle: 'Direct premium handwrapped gifting delivery networks serving Kathmandu, Lalitpur, Bhaktapur and global diaspora communities.',
    secureLogisticsTitle: 'Double Card Encrypted Gateway',
    secureLogisticsDesc: 'Scanned transfers allow instant invoice billing tags. Overseas orders from USA/UK/Australia run on premium automated card processing pipelines.',
    craftGuaranteeDesc: 'Each dynamic gift hamper is bespoke, handwrapped in wooden baskets with personalized handwritten notes. Contact our designers for dynamic customizations.',
    
    // Detailed footer columns from Koseli Xpress specs
    footerAboutLinks: [
      { label: 'About Us', url: '/pages/about' },
      { label: 'Contact', url: '/pages/contact' },
      { label: 'Offers', url: '/pages/offers' },
      { label: 'Social Media', url: '/pages/socials' }
    ],
    footerCategoriesLinks: [
      { label: 'Gift for Girl Friend', url: '/category/gift-hampers' },
      { label: 'Gift for Wife', url: '/category/gift-hampers' },
      { label: 'Birthday Gifts', url: '/category/gift-hampers' },
      { label: 'Birthday Cakes', url: '/category/gourmet-cakes' }
    ],
    footerLegalsLinks: [
      { label: 'Shipping Policy', url: '/pages/shipping-policy' },
      { label: 'Refund Policy', url: '/pages/refund-policy' },
      { label: 'Privacy Policy', url: '/pages/privacy-policy' },
      { label: 'Terms of service', url: '/pages/terms-of-service' }
    ],
    footerSocialsLinks: [
      { label: 'Facebook', url: 'https://facebook.com', platform: 'facebook' },
      { label: 'YouTube', url: 'https://youtube.com', platform: 'youtube' },
      { label: 'Instagram', url: 'https://instagram.com', platform: 'instagram' },
      { label: 'Tik Tok', url: 'https://tiktok.com', platform: 'tiktok' }
    ],
    
    // Registered Legal Businesses identities matching image
    registeredBusinessName: 'Koseli Xpress Pvt. Ltd.',
    panVatNumber: '619715335',
    companyAddress: 'Main Office - Budhanilkantha-12, Kapan Kathmandu, Nepal',
    registrationNumber: 'रजिष्ट्रेशन नम्बर- 313957/79/080, वा.रजिष्ट्रेशन नम्बर- 002-25',
    contactEmail: 'koselixpress@gmail.com',
    ecommerceNumber: 'on process',
    outlets: 'Main Branch - Kathmandu',
    complainOfficerName: 'Sabita Acharya',
    complainOfficerPhone: '9801354451',
    complainOfficerEmail: 'koselixpress@gmail.com',

    categoryDiscounts: [
      { categoryId: 'gift-hampers', discountPercent: 5, isEnabled: false },
      { categoryId: 'fresh-flowers', discountPercent: 10, isEnabled: false }
    ],
    paymentDiscounts: [
      { gatewayId: 'nps', discountPercent: 10, isEnabled: true },
      { gatewayId: 'esewa', discountPercent: 2, isEnabled: false }
    ]
  },
  store: {
    storeName: 'Koseli Xpress',
    supportEmail: 'support@koselixpress.com',
    supportPhone: '+977 1 4455888',
    address: 'Balkumari Ringroad, Lalitpur, Nepal',
    baseCurrencyCode: 'NPR',
    orderPrefix: 'KO-',
    maintenanceMode: false,
    geoRegion: 'NP-BA',
    geoPlacename: 'Kathmandu, Lalitpur, Bhaktapur',
    geoPosition: '27.717244;85.324060'
  },
  serviceFees: [
    { id: 'fee-premium', name: 'Premium Wooden Gift box Packaging', feeAmountNPR: 1000, isActive: true, allowedAllLocations: true, allowedDistricts: [], locationLeadTimes: {} },
    { id: 'fee-wrap', name: 'Cardboard Safety Over-Wrap Protection', feeAmountNPR: 500, isActive: true, allowedAllLocations: true, allowedDistricts: [], locationLeadTimes: {} },
    { id: 'fee-none', name: 'Standard Eco Bag Wrap', feeAmountNPR: 0, isActive: true, allowedAllLocations: true, allowedDistricts: [], locationLeadTimes: {} }
  ],
  pages: [
    {
      id: 'page-home',
      title: 'Home Page',
      slug: 'home',
      status: 'active',
      metaTitle: 'Send Flower Hampers, Birthday Cakes & Chocolates online in Nepal - Koseli Xpress',
      metaDescription: 'Instant luxury gifting dispatch in Kathmandu valley & cities. Fast custom combo builder with standard tracking checkout',
      metaKeywords: 'gift to nepal, flower dispatch, cake shop, custom hampers',
      sections: [
        {
          id: 'sec-banner',
          type: 'banner',
          data: {
            title: 'Express Gifting Redefined',
            subtitle: 'Curated premium hampers, fresh blossoms, and gourmet treats delivered right to their doorstep within 3 Hrs.',
            buttonText: 'Explore Curated Combos',
            buttonUrl: '/category/gift-hampers',
            imageUrl: 'https://images.unsplash.com/photo-154946?q=80&w=1200&auto=format&fit=crop'
          }
        },
        {
          id: 'sec-cats',
          type: 'categories_grid',
          data: {
            title: 'Browse Elegant Occasions',
            subtitle: 'Choose hand-tied bouquets or delicious freshly-baked premium dessert hampers.'
          }
        },
        {
          id: 'sec-split',
          type: 'image_content',
          data: {
            title: 'Sourced with Local Pride',
            subtitle: 'Each bouquet is styled by expert florists using local farm-fresh stems, and our beautiful cakes are baked fresh with zero additives.',
            content: 'Our mission is to bridge distance with luxury and personalized gestures of love.',
            imageUrl: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop',
            buttonText: 'Read Our Story',
            buttonUrl: '/custom-about'
          }
        },
        {
          id: 'sec-hampers-grid',
          type: 'products_grid',
          data: {
            title: 'Our Signature Best Sellers',
            subtitle: 'Guaranteed to impress. Add a handwritten gift card during checkout.',
            productIds: ['prod-roses-12', 'prod-truffle-1lb', 'prod-hamper-royal']
          }
        },
        {
          id: 'sec-faq',
          type: 'faq',
          data: {
            title: 'Frequently Answered Inquiries',
            faqs: [
              { question: 'What is your shipping window inside Kathmandu?', answer: 'We deliver all orders within 3 to 4 hours from transaction approval. You can specify a preferred time during confirmation.' },
              { question: 'Can I pay with credit cards if I live abroad?', answer: 'Yes! We support global Visa, MasterCard, and AMEX. Cards are mandatory for international clients.' },
              { question: 'Are hampers shipped as a whole combo pack?', answer: 'Yes, hampers arrive elegantly packaged. However, our logistics inventory separately tracks and depletes individual items.' }
            ]
          }
        }
      ]
    },
    {
      id: 'page-about',
      title: 'About Us',
      slug: 'custom-about',
      status: 'active',
      metaTitle: 'About Koseli Xpress - Nepal’s Premium Online Gift Boutique',
      metaDescription: 'Learn about our craft processes, delivery networks and core commitment to premium client experiences.',
      metaKeywords: 'about us, premium hampers store, florist history',
      sections: [
        {
          id: 'sec-about-header',
          type: 'text',
          data: {
            title: 'About Koseli Xpress',
            subtitle: 'Crafting smiles and high quality gifting memories since 2024.'
          }
        },
        {
          id: 'sec-about-body',
          type: 'image_content',
          data: {
            title: 'Expert Hands, Premium Care',
            subtitle: 'High precision quality and client support is our signature.',
            content: 'We inspect every flower petal and test every thermometer reading. No compromise on customer delight.',
            imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop'
          }
        }
      ]
    }
  ],
  deliveryDistricts: [
    { id: 'dist-1', name: 'Kathmandu Inside Ringroad', chargeNPR: 150 },
    { id: 'dist-2', name: 'Kathmandu Outside Ringroad (Suburbs)', chargeNPR: 300 },
    { id: 'dist-3', name: 'Lalitpur (City Center Areas)', chargeNPR: 100 },
    { id: 'dist-4', name: 'Bhaktapur (City Limits)', chargeNPR: 250 },
    { id: 'dist-5', name: 'Pokhara (Lakeside & Bazar)', chargeNPR: 450 },
    { id: 'dist-6', name: 'Chitwan / Bharatpur', chargeNPR: 400 },
    { id: 'dist-7', name: 'Biratnagar', chargeNPR: 500 },
    { id: 'dist-8', name: 'Dharan / Itahari', chargeNPR: 450 }
  ],
  deliveryGroups: [
    {
      id: 'grp-ktm',
      name: 'Kathmandu Valley',
      coverageArea: 'Kathmandu, Bhaktapur, Lalitpur, Banepa',
      deliveryMethod: 'Local Arrangement',
      estimatedDeliveryTime: 'Minimum 4 Hours',
      cutoffTime: '4:00 PM NST',
      deliveryTimeMinutes: 240,
      maxDaysToDeliver: 1,
      availableDistricts: [
        'Kathmandu Inside Ringroad',
        'Kathmandu Outside Ringroad (Suburbs)',
        'Lalitpur (City Center Areas)',
        'Bhaktapur (City Limits)'
      ]
    },
    {
      id: 'grp-major',
      name: 'Major Cities',
      coverageArea: 'Pokhara, Bharatpur, Biratnagar, Butwal, Nepalgunj, and other major cities',
      deliveryMethod: 'Local Arrangement',
      estimatedDeliveryTime: 'Next Day Delivery',
      cutoffTime: '4:00 PM NST',
      deliveryTimeMinutes: 1440,
      maxDaysToDeliver: 2,
      availableDistricts: [
        'Pokhara (Lakeside & Bazar)',
        'Chitwan / Bharatpur',
        'Biratnagar',
        'Dharan / Itahari'
      ]
    },
    {
      id: 'grp-tarai',
      name: 'Tarai Area',
      coverageArea: 'All Tarai Areas',
      deliveryMethod: 'Courier / Local Arrangement',
      estimatedDeliveryTime: '1–2 Days',
      cutoffTime: '4:00 PM NST',
      deliveryTimeMinutes: 2880,
      maxDaysToDeliver: 2,
      availableDistricts: [
        'Biratnagar',
        'Dharan / Itahari'
      ]
    },
    {
      id: 'grp-pahadi',
      name: 'Pahadi Bazaar Area',
      coverageArea: 'Hill Region Bazaar Areas',
      deliveryMethod: 'Courier / Local Arrangement',
      estimatedDeliveryTime: '1–3 Days',
      cutoffTime: '4:00 PM NST',
      deliveryTimeMinutes: 4320,
      maxDaysToDeliver: 3,
      availableDistricts: [
        'Pokhara (Lakeside & Bazar)',
        'Chitwan / Bharatpur'
      ]
    },
    {
      id: 'grp-rural',
      name: 'Pahadi & Himali Rural Area',
      coverageArea: 'Remote Hill & Himalayan Regions',
      deliveryMethod: 'Courier / Local Arrangement',
      estimatedDeliveryTime: '2–5 Days',
      cutoffTime: '4:00 PM NST',
      deliveryTimeMinutes: 7200,
      maxDaysToDeliver: 5,
      availableDistricts: [
        'Biratnagar',
        'Chitwan / Bharatpur'
      ]
    },
    {
      id: 'grp-express',
      name: 'Express Delivery Locations',
      coverageArea: 'Kathmandu, Pokhara, Birtamode, Hetauda, Biratnagar, Banepa, and 200+ Additional Locations',
      deliveryMethod: 'Local Arrangement',
      estimatedDeliveryTime: 'Minimum 4 Hours',
      cutoffTime: '4:00 PM NST',
      deliveryTimeMinutes: 240,
      maxDaysToDeliver: 1,
      availableDistricts: [
        'Kathmandu Inside Ringroad',
        'Kathmandu Outside Ringroad (Suburbs)',
        'Lalitpur (City Center Areas)',
        'Bhaktapur (City Limits)',
        'Pokhara (Lakeside & Bazar)',
        'Biratnagar'
      ]
    }
  ],
  paymentGateways: [
    {
      id: 'esewa',
      name: 'eSewa Wallet Payment',
      merchantId: 'EPAYTEST',
      secretKey: '8g786g78h76h876h876h87',
      apiEnvironment: 'test',
      isEnabled: true,
      logoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0AonXQx0n88M9sTCH6D_vO3ePZ0O7bQY63g&s',
      mappedAccountId: 'acc-esewa'
    },
    {
      id: 'khalti',
      name: 'Khalti Mobile Wallet',
      merchantId: 'khalti_merchant_9012',
      secretKey: 'live_secret_key_892348a8ebc',
      publicKey: 'live_public_key_892348a8ebc',
      apiEnvironment: 'test',
      isEnabled: true,
      logoUrl: 'https://blog.khalti.com/wp-content/uploads/2021/01/khalti-logo.png',
      mappedAccountId: 'acc-khalti'
    },
    {
      id: 'fonepay',
      name: 'Fonepay App Payment',
      merchantId: 'FP-MERCH-8809',
      secretKey: 'fonepay_secret_998822',
      apiEnvironment: 'test',
      isEnabled: false,
      mappedAccountId: 'acc-nabil'
    },
    {
      id: 'fonepay_dynamic',
      name: 'Fonepay Dynamic QR Code',
      merchantId: 'FP-DYN-0021',
      secretKey: 'dynamic_fone_sec_7711',
      apiEnvironment: 'test',
      isEnabled: false,
      mappedAccountId: 'acc-nabil'
    },
    {
      id: 'fonepay_static',
      name: 'Fonepay Static QR code / Image',
      merchantId: 'FP-STA-4491',
      secretKey: 'static_fone_sec_0029',
      apiEnvironment: 'test',
      isEnabled: true,
      logoUrl: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
      mappedAccountId: 'acc-nabil'
    },
    {
      id: 'nps',
      name: 'Visa Card & Master Card',
      merchantId: 'NPS-MERCH-3321',
      secretKey: 'nps_secret_key_df9012',
      apiEnvironment: 'test',
      isEnabled: true,
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/349/349221.png',
      mappedAccountId: 'acc-nabil'
    },
    {
      id: 'nabil',
      name: 'Nabil Bank - Visa / Mastercard',
      merchantId: 'NABIL-GATE-5021',
      secretKey: 'nabil_gateway_hash_80129',
      apiEnvironment: 'test',
      isEnabled: false,
      mappedAccountId: 'acc-nabil'
    },
    {
      id: 'manual',
      name: 'Manual Bank Transfer / QR Pay',
      merchantId: 'MANUAL',
      secretKey: 'N/A',
      apiEnvironment: 'test',
      isEnabled: true,
      priority: 3,
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/10015/10015424.png',
      extraSettings: {
        bankName: 'NIC Asia Bank',
        accountName: 'Koseli Xpress Private Limited',
        accountNumber: '2440192830129302',
        branchName: 'Kathmandu Branch',
        instructions: 'Please transfer the exact order amount and upload/send the payment screenshot to our WhatsApp support (+977 9862200000) for instant order verification.',
        qrImageUrl: 'https://images.unsplash.com/photo-1546197390-3b47722aa7d4?q=80&w=300&auto=format&fit=crop'
      },
      mappedAccountId: 'acc-nabil'
    },
    {
      id: 'cod',
      name: 'Cash on Delivery (COD)',
      merchantId: 'COD-SYSTEM',
      secretKey: 'N/A',
      apiEnvironment: 'live',
      isEnabled: true,
      priority: 1,
      logoUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png',
      extraSettings: {
        instructions: 'Please keep the exact change of order total amount ready for our delivery representative. No extra service fee is required during delivery.'
      },
      mappedAccountId: 'acc-cash'
    }
  ],
  vendors: [
    { id: 'v-bakers', name: 'Valley Cake Boutique', phone: '9841234567', email: 'orders@valleycakes.com', address: 'Putalisadak, Kathmandu', createdAt: '2026-05-10T12:00:00Z' },
    { id: 'v-florists', name: 'Nursery Blossom Farms', phone: '9801234567', email: 'rajesh@blossoms.com', address: 'Tokha, Kathmandu', createdAt: '2026-05-11T09:30:00Z' }
  ],
  purchaseEntries: [
    { id: 'p-001', vendorId: 'v-florists', productId: 'prod-roses-12', quantity: 50, unitCost: 650, totalCost: 32500, purchaseDate: '2026-05-25', paymentAccountId: 'acc-nabil' },
    { id: 'p-002', vendorId: 'v-bakers', productId: 'prod-truffle-1lb', quantity: 20, unitCost: 800, totalCost: 16000, purchaseDate: '2026-05-28', paymentAccountId: 'acc-nabil' }
  ],
  expenseEntries: [
    { id: 'e-001', title: 'Ad Campaign for Father\'s Day', amount: 5000, category: 'Marketing', expenseDate: '2026-05-28', notes: 'Facebook boost for Father\'s day combos', paymentAccountId: 'acc-nabil' },
    { id: 'e-002', title: 'Main Store Office Rent', amount: 25000, category: 'Rent', expenseDate: '2026-05-01', notes: 'Lalitpur showroom workspace rent', paymentAccountId: 'acc-nabil' }
  ],
  treasuryAccounts: [
    { id: 'acc-cash', name: 'Cash on Hand', type: 'cash', openingBalance: 10000, currentBalance: 10000, createdAt: '2026-05-01T00:00:00Z' },
    { id: 'acc-esewa', name: 'eSewa Merchant Wallet', type: 'esewa', openingBalance: 25000, currentBalance: 25000, createdAt: '2026-05-01T00:00:00Z' },
    { id: 'acc-khalti', name: 'Khalti Corporate POS', type: 'khalti', openingBalance: 15000, currentBalance: 15000, createdAt: '2026-05-01T00:00:00Z' },
    { id: 'acc-nabil', name: 'Nabil Bank Business A/C', type: 'bank', accountNumber: '1002930489110', openingBalance: 150000, currentBalance: 150000, createdAt: '2026-05-01T00:00:00Z' },
    { id: 'acc-wallet', name: 'Other Digital Wallet POS', type: 'wallet', openingBalance: 5000, currentBalance: 5000, createdAt: '2026-05-01T00:00:00Z' }
  ],
  treasuryTransactions: [
    { id: 'tx-001', accountId: 'acc-nabil', type: 'debit', amount: 32500, purpose: 'Vendor Purchase: Nursery Blossom Farms (p-001)', referenceId: 'p-001', timestamp: '2026-05-25T14:30:00Z' },
    { id: 'tx-002', accountId: 'acc-nabil', type: 'debit', amount: 16000, purpose: 'Vendor Purchase: Valley Cake Boutique (p-002)', referenceId: 'p-002', timestamp: '2026-05-28T16:00:00Z' },
    { id: 'tx-003', accountId: 'acc-nabil', type: 'debit', amount: 5000, purpose: 'Expense Payout: Ad Campaign for Father\'s Day (e-001)', referenceId: 'e-001', timestamp: '2026-05-28T17:15:00Z' },
    { id: 'tx-004', accountId: 'acc-nabil', type: 'debit', amount: 25000, purpose: 'Expense Payout: Main Store Office Rent (e-002)', referenceId: 'e-002', timestamp: '2026-05-01T10:00:00Z' }
  ],
  complianceFooter: {
    registeredBusinessName: 'Koseli Xpress Private Limited',
    registrationNumber: 'Reg No. 283941/079/080',
    panVatNumber: '610293848',
    ecommerceNumber: 'E-COM-0391-KTM',
    establishmentDate: '2023-01-15',
    regulatoryAuthority: 'Department of Commerce, Supplies and Consumer Protection',
    licenseNumber: 'LIC-9428-SEC',
    certificationInfo: 'ISO 9001:2015 Quality Management Certified',
    supportEmail: 'support@koselixpress.com',
    supportPhone: '+977 1 4455888',
    corporateEmail: 'corporate@koselixpress.com',
    corporatePhone: '+977-9851082531',
    registeredOfficeAddress: 'Balkumari Ringroad, Lalitpur, Ward No. 9, Nepal',
    headOfficeAddress: 'Balkumari Ringroad, Lalitpur, Ward No. 9, Nepal',
    outlets: 'Kathmandu - New Road Outlet | Lalitpur - Balkumari Showroom | Pokhara Hub - Chipledhunga',
    complianceOfficerName: 'Sabita Acharya',
    complianceOfficerMobile: '+977-9801354451',
    complianceOfficerEmail: 'sabita.acharya@koselixpress.com',
    additionalComplianceDetails: 'Compliant with prevailing AML/CFT legislation of Nepal and Nepal Rastra Bank Guidelines on digital payment security.',
    footerGroups: [
      {
        id: 'group-about',
        title: 'About Company',
        links: [
          { id: 'l-about', label: 'About Us', url: '/pages/about-us' },
          { id: 'l-contact', label: 'Contact Us', url: '/pages/contact-us' },
          { id: 'l-offers', label: 'Offers', url: '/pages/offers' },
          { id: 'l-social', label: 'Social Media', url: '/pages/social-media' },
          { id: 'l-careers', label: 'Careers', url: '/pages/careers' },
          { id: 'l-corp', label: 'Corporate Information', url: '/pages/corporate-info' }
        ]
      },
      {
        id: 'group-legal',
        title: 'Legal & Compliance',
        links: [
          { id: 'l-ship', label: 'Shipping Policy', url: '/pages/shipping-policy' },
          { id: 'l-refund', label: 'Refund Policy', url: '/pages/refund-policy' },
          { id: 'l-privacy', label: 'Privacy Policy', url: '/pages/privacy-policy' },
          { id: 'l-tos', label: 'Terms of Service', url: '/pages/terms-of-service' },
          { id: 'l-return', label: 'Return Policy', url: '/pages/return-policy' },
          { id: 'l-aml', label: 'AML/CFT Policy', url: '/pages/aml-cft-policy' },
          { id: 'l-kyc', label: 'KYC Policy', url: '/pages/kyc-policy' },
          { id: 'l-disclaimer', label: 'Disclaimer', url: '/pages/disclaimer' }
        ]
      }
    ],
    popularCategoriesEnabled: true,
    socials: [
      { id: 'soc-fb', platform: 'facebook', url: 'https://facebook.com/koselixpress', isEnabled: true },
      { id: 'soc-ig', platform: 'instagram', url: 'https://instagram.com/koselixpress', isEnabled: true },
      { id: 'soc-tk', platform: 'tiktok', url: 'https://tiktok.com/@koselixpress', isEnabled: true },
      { id: 'soc-yt', platform: 'youtube', url: 'https://youtube.com/koselixpress', isEnabled: false },
      { id: 'soc-ln', platform: 'linkedin', url: 'https://linkedin.com/company/koselixpress', isEnabled: true },
      { id: 'soc-tw', platform: 'twitter', url: 'https://twitter.com/koselixpress', isEnabled: false }
    ],
    logoWidth: 160
  },
  smtpSettings: {
    isEnabled: false,
    gmailAddress: 'support@koselixpress.com',
    appPassword: '',
    senderName: 'Koseli Xpress',
    replyToEmail: 'support@koselixpress.com'
  },
  emailTemplates: [
    {
      id: 'confirmation',
      name: 'Order Confirmation Email',
      subject: 'Order Confirmed - #{{orderNumber}} | Koseli Xpress',
      body: '<p>Dear Customer, Greetings !! Namaste !!</p><p>This email is to confirm that we have received your order #{{orderNumber}}.,</p><h3>Order Details</h3><ul><li>Order: #{{orderNumber}}</li><li>Amount: NPR {{orderAmount}}</li><li>Payment Status: {{paymentStatus}}</li></ul><h3>Delivery Information</h3><ul><li>Receiver Name: {{receiverName}}</li><li>Address: {{deliveryAddress}}</li><li>Time Slot: {{deliveryTimeSlot}}</li></ul><p>Track your physical express delivery instant status online: <a href="{{trackingUrl}}">{{trackingUrl}}</a></p><hr><p>Regards Koseli Xpress -CSR , thank you for choosing us for gifting.</p>'
    },
    {
      id: 'processing',
      name: 'Order Processing Email',
      subject: 'Your Order #{{orderNumber}} is being Handwrapped!',
      body: '<h2>Exciting news!</h2><p>Our wrapping artists and confectionary chefs have begun preparing your bespoke custom gift set #{{orderNumber}}.</p><p>Track updates here: <a href="{{trackingUrl}}">{{trackingUrl}}</a></p>'
    },
    {
      id: 'shipped',
      name: 'Order Out For Delivery/Shipped - #{{orderNumber}}',
      subject: 'Your Koseli Gift is On the Way! 🚚',
      body: '<h2>Order Shipped!</h2><p>Our logistics partner agent is now in transit with your order #{{orderNumber}}.</p><p>Recipient: {{receiverName}}<br>Location: {{deliveryAddress}}</p><p>Expect real-time arrival in under 3 hours!</p><p>Track: <a href="{{trackingUrl}}">{{trackingUrl}}</a></p>'
    },
    {
      id: 'delivered',
      name: 'Order Delivered Successfully - #{{orderNumber}}',
      subject: 'Delivered with Smiles! 😊 - #{{orderNumber}}',
      body: '<h2>Hooray, Delivered!</h2><p>Your gift hamper order #{{orderNumber}} was successfully hand-signed and delivered to <strong>{{receiverName}}</strong> at {{deliveryAddress}}.</p><p>Thank you for shopping with Koseli Xpress.</p>'
    },
    {
      id: 'cancelled',
      name: 'Order Cancellation - #{{orderNumber}}',
      subject: 'Order #{{orderNumber}} Cancelled',
      body: '<h2>Order Cancelled</h2><p>Your order #{{orderNumber}} has been cancelled. Any processed payment will be refunded according to our standard terms.</p>'
    }
  ],
  emailLogs: [],
  visitorTracks: generateSeedVisitors(),
  customerAuthConfig: {
    enableGoogleLogin: true,
    enableGuestCheckout: true,
    enableAutoOrderLinking: true,
    googleClientId: '839401928401-abc8382910abcde9384910.apps.googleusercontent.com',
    googleClientSecret: 'GOCSPX-abc123456789defGHIJKL-xyz',
    googleRedirectUrl: 'https://koselixpress.com/api/auth/callback/google',
    matchOrdersByEmail: true,
    enableAutoMerge: true,
    enableAccountCreationOnLogin: true,
    allowDuplicateEmails: false,
    sessionTimeoutMinutes: 60
  },
  supportChats: []
};

const DB_KEY = 'koseli_xpress_db';

export function getDbState(): DatabaseState {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_STATE));
    return INITIAL_STATE;
  }
  try {
    const parsed = JSON.parse(data);
    let changed = false;

    if (!parsed.supportChats) {
      parsed.supportChats = [];
      changed = true;
    }
    
    // Synchronize default administrative users credentials with INITIAL_STATE
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = [...INITIAL_STATE.users];
      changed = true;
    } else {
      INITIAL_STATE.users.forEach((initialUser) => {
        const existing = parsed.users.find((u: any) => u.email.toLowerCase() === initialUser.email.toLowerCase());
        if (existing) {
          if (existing.password !== initialUser.password || existing.passcode !== initialUser.passcode) {
            existing.password = initialUser.password;
            existing.passcode = initialUser.passcode;
            changed = true;
          }
        } else {
          parsed.users.push({ ...initialUser });
          changed = true;
        }
      });
    }

    if (!parsed.deliveryDistricts || parsed.deliveryDistricts.length === 0) {
      parsed.deliveryDistricts = INITIAL_STATE.deliveryDistricts;
      changed = true;
    }
    if (!parsed.deliveryGroups || parsed.deliveryGroups.length < 6) {
      parsed.deliveryGroups = INITIAL_STATE.deliveryGroups;
      changed = true;
    }
    if (parsed.products) {
      parsed.products.forEach((prod: any) => {
        // Translate old IDs to new ones
        if (prod.deliveryGroupId === 'grp-3hr') prod.deliveryGroupId = 'grp-ktm';
        if (prod.deliveryGroupId === 'grp-outstation') prod.deliveryGroupId = 'grp-major';
        if (prod.deliveryGroupId === 'grp-sameday') prod.deliveryGroupId = 'grp-major';

        if (!prod.deliveryGroupIds || prod.deliveryGroupIds.length === 0) {
          if (prod.deliveryGroupId) {
            prod.deliveryGroupIds = [prod.deliveryGroupId];
          } else {
            prod.deliveryGroupIds = ['grp-ktm'];
          }
          changed = true;
        }
        
        // Keep deliveryGroupId in sync with the first selected group as dynamic fallback
        if (prod.deliveryGroupIds && prod.deliveryGroupIds.length > 0 && prod.deliveryGroupId !== prod.deliveryGroupIds[0]) {
          prod.deliveryGroupId = prod.deliveryGroupIds[0];
          changed = true;
        }
      });
    }
    
    // Core accounting collections initialization
    if (!parsed.vendors) {
      parsed.vendors = INITIAL_STATE.vendors;
      changed = true;
    }
    if (!parsed.purchaseEntries) {
      parsed.purchaseEntries = INITIAL_STATE.purchaseEntries;
      changed = true;
    }
    if (!parsed.expenseEntries) {
      parsed.expenseEntries = INITIAL_STATE.expenseEntries;
      changed = true;
    }
    if (!parsed.treasuryAccounts) {
      parsed.treasuryAccounts = INITIAL_STATE.treasuryAccounts;
      changed = true;
    }
    if (!parsed.treasuryTransactions) {
      parsed.treasuryTransactions = INITIAL_STATE.treasuryTransactions;
      changed = true;
    }

    if (!parsed.rolePermissions) {
      parsed.rolePermissions = {
        [Role.ADMIN]: { orderProcess: true, accounts: true, productEdit: true, purchaseEntry: true, systemSettings: true },
        [Role.MANAGER]: { orderProcess: true, accounts: false, productEdit: true, purchaseEntry: true, systemSettings: false },
        [Role.STAFF]: { orderProcess: true, accounts: false, productEdit: false, purchaseEntry: false, systemSettings: false }
      };
      changed = true;
    }

    if (!parsed.paymentGateways || parsed.paymentGateways.length === 0) {
      parsed.paymentGateways = INITIAL_STATE.paymentGateways;
      changed = true;
    } else {
      // Auto-migrate to make sure the brand new presets are present
      const hasManual = parsed.paymentGateways.some((gw: any) => gw.id === 'manual');
      if (!hasManual) {
        const manualPreset = INITIAL_STATE.paymentGateways?.find(gw => gw.id === 'manual');
        if (manualPreset) {
          parsed.paymentGateways.push(manualPreset);
          changed = true;
        }
      }

      const hasCod = parsed.paymentGateways.some((gw: any) => gw.id === 'cod');
      if (!hasCod) {
        const codPreset = INITIAL_STATE.paymentGateways?.find(gw => gw.id === 'cod');
        if (codPreset) {
          parsed.paymentGateways.push(codPreset);
          changed = true;
        }
      }

      // Ensure priorities exist and rename nps gateway to Visa Card & Master Card
      parsed.paymentGateways.forEach((gw: any) => {
        if (gw.id === 'nps' && (!gw.name || gw.name.includes('Nepal') || gw.name.includes('NPS') || gw.name.includes('Pament') || gw.name.includes('Payment'))) {
          gw.name = 'Visa Card & Master Card';
          changed = true;
        }
        if (gw.priority === undefined) {
          const match = INITIAL_STATE.paymentGateways?.find(m => m.id === gw.id);
          gw.priority = match?.priority || 10;
          changed = true;
        }
      });
    }

    // Default appearance colors if missing
    if (!parsed.appearance) {
      parsed.appearance = { ...INITIAL_STATE.appearance };
      changed = true;
    }
    
    // Copy missing default cosmetic/notice/footer configurations from initial preset
    const appearanceKeys = [
      'domainName', 'favImage', 'slogan', 'stickyNotice', 'websiteTextFont',
      'shippingNotice', 'shortTermsAndConditions', 'fullTermsAndConditions',
      'footerAboutLinks', 'footerCategoriesLinks', 'footerLegalsLinks', 'footerSocialsLinks',
      'registeredBusinessName', 'panVatNumber', 'companyAddress', 'registrationNumber',
      'contactEmail', 'ecommerceNumber', 'outlets', 'complainOfficerName', 'complainOfficerPhone', 'complainOfficerEmail',
      'categoryDiscounts', 'paymentDiscounts',
      'giftingSlaDisclaimer', 'brandDescriptionStyle', 'secureLogisticsTitle', 'secureLogisticsDesc', 'craftGuaranteeDesc'
    ];
    appearanceKeys.forEach(k => {
      if (parsed.appearance[k] === undefined) {
        parsed.appearance[k] = (INITIAL_STATE.appearance as any)[k];
        changed = true;
      }
    });

    if (parsed.orders) {
      const has79985 = parsed.orders.some((ord: any) => ord.refId === 'KO--79985');
      if (!has79985) {
        const order79985 = INITIAL_STATE.orders.find(ord => ord.refId === 'KO--79985');
        if (order79985) {
          // Put the newest order first or just push it
          parsed.orders.push(order79985);
          changed = true;
        }
      }
    }

    if (!parsed.appearance.themeMode || parsed.appearance.themeMode === 'crimson') {
      parsed.appearance.themeMode = 'light';
      changed = true;
    }
    if (!parsed.appearance.primaryColor || parsed.appearance.primaryColor === '#f59e0b') {
      parsed.appearance.primaryColor = '#d11252';
      changed = true;
    }
    if (!parsed.appearance.secondaryColor || parsed.appearance.secondaryColor === '#a78bfa') {
      parsed.appearance.secondaryColor = '#492583';
      changed = true;
    }

    if (!parsed.appearance.websiteTextFont || parsed.appearance.websiteTextFont === 'inter') {
      parsed.appearance.websiteTextFont = 'poppins';
      changed = true;
    }

    if (!parsed.complianceFooter) {
      parsed.complianceFooter = INITIAL_STATE.complianceFooter;
      changed = true;
    }

    if (!parsed.smtpSettings) {
      parsed.smtpSettings = INITIAL_STATE.smtpSettings;
      changed = true;
    }
    if (!parsed.emailTemplates || parsed.emailTemplates.length === 0) {
      parsed.emailTemplates = INITIAL_STATE.emailTemplates;
      changed = true;
    } else {
      const confT = parsed.emailTemplates.find((t: any) => t.id === 'confirmation');
      if (confT && (confT.body.includes('Thank you for your order') || !confT.body.includes('Namaste !!'))) {
        confT.body = INITIAL_STATE.emailTemplates.find((t: any) => t.id === 'confirmation')?.body || confT.body;
        changed = true;
      }
    }
    if (!parsed.emailLogs) {
      parsed.emailLogs = INITIAL_STATE.emailLogs || [];
      changed = true;
    }
    if (!parsed.visitorTracks || parsed.visitorTracks.length === 0) {
      parsed.visitorTracks = generateSeedVisitors();
      changed = true;
    }
    if (!parsed.customerAuthConfig) {
      parsed.customerAuthConfig = { ...INITIAL_STATE.customerAuthConfig };
      changed = true;
    }

    if (!parsed.specialDayReminders) {
      const date4DaysAhead = new Date();
      date4DaysAhead.setDate(date4DaysAhead.getDate() + 4);
      const mm = String(date4DaysAhead.getMonth() + 1).padStart(2, '0');
      const dd = String(date4DaysAhead.getDate()).padStart(2, '0');
      const seedDateStr = `${date4DaysAhead.getFullYear()}-${mm}-${dd}`;

      parsed.specialDayReminders = [
        {
          id: 'rem-seed-1',
          name: 'Dinesh Chalise (Dad)',
          relation: 'Father',
          date: seedDateStr,
          email: 'dinesh.dineshchalise@gmail.com',
          phone: '+9779841234567',
          notes: 'Likes chocolate truffle cakes and fresh flowers combos',
          createdAt: new Date().toISOString().substring(0, 10),
          autoReminded: false
        },
        {
          id: 'rem-seed-2',
          name: 'Sujata Adhikari (Sister)',
          relation: 'Sibling',
          date: `${new Date().getFullYear()}-09-12`,
          email: 'sujata@example.com',
          phone: '+9779800000002',
          notes: 'Enjoys luxury chocolates and fresh lilies',
          createdAt: new Date().toISOString().substring(0, 10),
          autoReminded: false
        }
      ];
      changed = true;
    }

    if (changed) {
      localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse DB, resetting.');
    localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_STATE));
    return INITIAL_STATE;
  }
}

export function saveDbState(state: DatabaseState) {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
}

export function resetDbToPreset() {
  localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_STATE));
  return INITIAL_STATE;
}

// Global hook/state replacement callbacks can be triggered where needed.
