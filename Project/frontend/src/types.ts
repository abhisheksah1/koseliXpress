export enum ProductStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  DELETED = 'deleted',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum LeadStatus {
  FAILED = 'failed',
  FOLLOWED_UP = 'followed_up',
  RECOVERED = 'recovered',
}

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export interface UserRole {
  email: string;
  role: Role | string;
  invitedAt: string;
  passcode?: string;
  fullName?: string;
  username?: string;
  password?: string;
  mobile?: string;
  status?: 'active' | 'inactive';
  isSuperAdmin?: boolean;
}

export interface CustomPageSection {
  id: string;
  type: 'banner' | 'text' | 'button' | 'image_content' | 'video' | 'slider' | 'categories_grid' | 'products_grid' | 'faq' | 'reviews' | 'google_review' | 'code_embed' | 'delivery_countdown' | 'footer_builder' | 'trust_strip' | 'features' | 'cta_band';
  data: {
    title?: string;
    subtitle?: string;
    content?: string;
    buttonText?: string;
    buttonUrl?: string;
    imageUrl?: string;
    videoUrl?: string; // YouTube
    youtubeId?: string;
    images?: string[]; // Slider
    categoryIds?: string[];
    productIds?: string[];
    faqs?: { question: string; answer: string }[];
    googleReviewUrl?: string;
    codeEmbed?: string;
    // Premium Category Grid properties
    selectedCategoryIds?: string[];
    hideEmpty?: boolean;
    sortBy?: string;
    limitCount?: number;
    // Premium Image with Content layouts
    layoutPreset?: string;
    buttonLabel?: string;
    buttonPath?: string;
    buttonStyle?: string;
    // Premium Google Review carousel filters
    onlyFiveStars?: boolean;
    onlyWithComments?: boolean;
    reviewsList?: {
      id: string;
      author: string;
      rating: number;
      comment: string;
      relativeDate: string;
      initials?: string;
      avatarBg?: string;
      timestamp?: number;
    }[];
    // Delivery Countdown Widget properties
    countdownRules?: {
      id?: string;
      zoneName: string;
      cutoffTime: string;
      timezone: string;
      headingBefore: string;
      subHeadingBefore?: string;
      subHeading?: string;
      headingAfter?: string;
      enableAutoSwitch?: boolean;
      autoSwitch?: boolean;
      headingAutoDisabled?: string;
      buttonText?: string;
      buttonUrl?: string;
    }[];
    countdownShowDays?: boolean;
    countdownShowHours?: boolean;
    countdownShowMinutes?: boolean;
    countdownShowSeconds?: boolean;
    countdownBgColor?: string;
    countdownBgImage?: string;
    countdownOverlayColor?: string;
    countdownHeadingColor?: string;
    countdownSubHeadingColor?: string;
    countdownTimerBoxColor?: string;
    countdownTimerTextColor?: string;
    countdownBtnColor?: string;
    countdownBtnTextColor?: string;
    countdownBorderRadius?: string;
    countdownPaddingDesktop?: string;
    countdownPaddingTablet?: string;
    countdownPaddingMobile?: string;
    countdownMarginDesktop?: string;
    countdownMarginTablet?: string;
    countdownMarginMobile?: string;
    // Footer Builder compliance overrides
    logoUrl?: string;
    logoWidth?: number;
    registeredBusinessName?: string;
    registrationNumber?: string;
    panVatNumber?: string;
    ecommerceNumber?: string;
    establishmentDate?: string;
    regulatoryAuthority?: string;
    licenseNumber?: string;
    certificationInfo?: string;
    supportEmail?: string;
    supportPhone?: string;
    corporateEmail?: string;
    corporatePhone?: string;
    registeredOfficeAddress?: string;
    headOfficeAddress?: string;
    outlets?: string;
    complianceOfficerName?: string;
    complianceOfficerMobile?: string;
    complianceOfficerEmail?: string;
    additionalComplianceDetails?: string;
    footerGroups?: FooterLinkGroup[];
    popularCategoriesEnabled?: boolean;
    socials?: SocialMediaConfig[];
    // Text block typography & CTA button options
    headingSize?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
    textAlignment?: 'left' | 'center' | 'right' | 'justify';
    textColor?: string;
    buttonEnabled?: boolean;
  };
}

export interface DynamicPage {
  id: string;
  title: string;
  slug: string;
  status: 'active' | 'draft';
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  sections: CustomPageSection[];
  focusKeyword?: string;
}

export interface CategoryMenuPlacement {
  id: string;
  parentMenuId: 'main' | string; // 'main' or a Category ID for sub-menus
  sequence: number;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  priority?: number; // ordering on navigation/filtering lists
  showInNavbar?: boolean; // toggle in customer navigation menu bar
  navbarSeq?: number; // order position in the header navigation menu
  parentCategoryId?: string; // allow single level submenus
  menuPlacements?: CategoryMenuPlacement[];
  focusKeyword?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

export interface ProductVariationOption {
  value: string; // e.g. "Chocolate Truffle Extra Match", "Red", "Blue", "1 Lbs", "2 Lbs"
  priceAdjustment: number; // relative price adjustment e.g. +300 or -100
  stock?: number; // Optional individual stock level tracking for this variation
}

export interface ProductVariation {
  id: string;
  name: string; // e.g. "Size", "Color", "Flavor"
  options: ProductVariationOption[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  categoryIds?: string[]; // Multiple categories published on
  description: string;
  images: string[];
  price: number; // In default base currency
  costPrice: number; // For ROI/profit reports
  status: ProductStatus;
  sku: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  stock: number;
  lowStockThreshold: number;
  isHamper: boolean;
  hamperItems?: { productId: string; quantity: number; selectedVariations?: { name: string; value: string }[] }[]; // Subcomponents of hamper
  allowCakeMessage?: boolean; // configuration for personalization
  allowGiftMessage?: boolean; // configuration for personalization
  allowPhotoUpload?: boolean; // configuration for personalization
  allowOrderWhenOutOfStock?: boolean; // toggle to allow ordering out of stock
  discountPrice?: number; // Optional discount/promotional price
  variations?: ProductVariation[];
  longDescription?: string;
  deliveryGroupId?: string;
  deliveryGroupIds?: string[];
  additionalNote?: string;
  focusKeyword?: string;
  outOfStockDate?: string; // Date when stock dropped to/remained 0
  weight?: string | number;
  barcode?: string;
  group?: string;
  variant?: string;
  size?: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  status: 'published' | 'unpublished';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  expiryDate: string;
  isActive: boolean;
  maxUses?: number; // 0 or undefined for unlimited, otherwise a positive integer like 1
  usesCount?: number; // how many times this coupon has been used
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedPrice?: number;
  customMessage?: string; // Message customized on cakes / gifts card
  customImageUrl?: string; // Image uploaded for print products
  selectedVariations?: { name: string; value: string; priceAdjustment: number }[];
}

export interface Lead {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cartItems: CartItem[];
  additionalServiceFeeAdded?: string | null;
  currency: string;
  totalAmount: number;
  status: LeadStatus;
  createdAt: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryDistrictId?: string;
  deliveryAddress?: string;
  orderNote?: string;
  preferredDeliveryDate?: string;
  selectedTimeSlotId?: string;
  paymentMethod?: string;
}

export interface DeliveryDistrict {
  id: string;
  name: string;
  chargeNPR: number;
}

export interface DeliveryGroup {
  id: string;
  name: string;
  deliveryTimeMinutes: number;
  availableDistricts: string[];
  maxDaysToDeliver: number;
  coverageArea?: string;
  deliveryMethod?: string;
  estimatedDeliveryTime?: string;
  cutoffTime?: string;
}

export interface Order {
  id: string;
  refId: string; // Dynamic tracking reference (e.g. KO-10294)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  deliveryDistrict?: string;
  deliveryAddress?: string;
  orderNote?: string;
  preferredDeliveryDate?: string;
  deliveryChargeAmount?: number; // delivery fee charged
  items: { 
    productId: string; 
    quantity: number; 
    selectedPrice: number; 
    productName: string; 
    customMessage?: string; 
    customImageUrl?: string;
    selectedVariations?: { name: string; value: string; priceAdjustment: number }[];
    isBackorder?: boolean;
  }[];
  additionalServiceFeeAdded: string | null;
  additionalServiceFeeAmount: number;
  serviceFeeDetails?: { id: string; name: string; text?: string; imageUrl?: string }[];
  currency: string;
  exchangeRate: number;
  totalAmount: number; // Amount paid in local selected currency
  totalAmountBase: number; // Converted back to NPR base for reports
  couponCodeUsed?: string;
  paymentMethod: string;
  status: OrderStatus;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  stockAdjusted?: boolean;
  createdAt: string;
  selectedTimeSlot?: string;
  timeSlotChargeAmount?: number;
  apiPartnerId?: string;
  apiPartnerUsername?: string;
}

export interface CurrencySettings {
  code: string;
  symbol: string;
  rateToNPR: number; // exchange rate relative to base e.g. NPR = 1.0, INR = 1.6, USD = 133
  isDefault: boolean;
}

export interface PluginSettings {
  whatsappNumber: string;
  whatsappMessage: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  whatsappIconType?: 'whatsapp' | 'message-circle' | 'message-square' | 'phone' | 'custom-svg';
  whatsappCustomSvg?: string;
  aiChatEnabled?: boolean;
  aiChatScheduleEnabled?: boolean;
  aiChatStartTime?: string;
  aiChatEndTime?: string;
  aiSupportKnowledge?: string;
  aiSupportFallbackInstruction?: string;
}

export interface AppearanceSettings {
  themeMode: 'crimson' | 'emerald' | 'royal' | 'midnight' | 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  siteLogo: string;
  navbarLinks: {
    id: string;
    title: string;
    url: string;
    type?: 'category' | 'page' | 'custom';
    categoryId?: string;
    parentMenuId?: string; // ID of another navbarLink or 'main'
    sequence?: number; // ordering
    enabled?: boolean;
  }[];
  domainName?: string;
  favImage?: string;
  slogan?: string;
  stickyNotice?: string;
  websiteTextFont?: string; // e.g. 'inter' | 'serif' | 'mono'
  shippingNotice?: string;
  shortTermsAndConditions?: string;
  fullTermsAndConditions?: string;
  
  // Footer Link Categories
  footerAboutLinks?: { label: string; url: string }[];
  footerCategoriesLinks?: { label: string; url: string }[];
  footerLegalsLinks?: { label: string; url: string }[];
  footerSocialsLinks?: { label: string; url: string; platform: string }[];
  
  // Footer Legal Registries
  registeredBusinessName?: string;
  panVatNumber?: string;
  companyAddress?: string;
  registrationNumber?: string;
  contactEmail?: string;
  ecommerceNumber?: string;
  outlets?: string;
  complainOfficerName?: string;
  complainOfficerPhone?: string;
  complainOfficerEmail?: string;

  // Real-time custom Category and Payment Gateway specific Discount Rules
  categoryDiscounts?: { categoryId: string; discountPercent: number; isEnabled: boolean }[];
  paymentDiscounts?: { gatewayId: string; discountPercent: number; isEnabled: boolean }[];

  // Dynamic Gifting Compliance & Brand Trust Badges Setup
  giftingSlaDisclaimer?: string;
  brandDescriptionStyle?: string;
  secureLogisticsTitle?: string;
  secureLogisticsDesc?: string;
  craftGuaranteeDesc?: string;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  baseCurrencyCode: string;
  orderPrefix: string;
  maintenanceMode?: boolean; // toggle to block public users
  geoRegion?: string;       // e.g. "NP-BA" (Bagmati, Nepal)
  geoPlacename?: string;    // e.g. "Kathmandu, Lalitpur, Bhaktapur"
  geoPosition?: string;     // e.g. "27.717244;85.324060"
  landingPageSlug?: string; // page builder slug used for the public root path
}

export interface ServiceFee {
  id: string;
  name: string;
  feeAmountNPR: number;
  isActive: boolean;
  allowedAllLocations?: boolean;
  allowedDistricts?: string[];
  locationLeadTimes?: Record<string, number>;
  inputType?: 'none' | 'text' | 'image' | 'both';
  inputLabel?: string;
}

export interface PaymentGateway {
  id: string; // 'esewa' | 'khalti' | 'fonepay' | 'fonepay_dynamic' | 'fonepay_static' | 'nps' | 'nabil' | 'manual' | 'cod'
  name: string;
  logoUrl?: string;
  merchantId: string;
  secretKey: string;
  publicKey?: string;
  apiEnvironment: 'test' | 'live';
  isEnabled: boolean;
  priority?: number; // lower numeric position displays first
  acceptableCurrencies?: string[];
  extraSettings?: {
    [key: string]: string;
  };
  mappedAccountId?: string; // Designated bank/wallet receiving account for this gateway
}

// Basic Accounting Types
export interface Vendor {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface PurchaseEntry {
  id: string;
  vendorId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  purchaseDate: string;
  referenceNo?: string;
  billType?: 'vat' | 'pan' | 'estimated'; // vat, pan or estimated
  vatCharged?: number; // Calculated 13% tax for 'vat' bill type
  selectedVariations?: { name: string; value: string; priceAdjustment: number }[];
  paymentAccountId?: string; // selected payout treasury account
}

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  category: string; // e.g. "Rent", "Salary", "Delivery Equipment", "Utilities"
  expenseDate: string;
  notes?: string;
  paymentAccountId?: string; // selected payout treasury account
}

export interface TreasuryAccount {
  id: string;
  name: string;
  type: 'bank' | 'esewa' | 'khalti' | 'cash' | 'wallet' | 'other';
  accountNumber?: string;
  openingBalance: number;
  currentBalance: number;
  createdAt: string;
  bankName?: string;
  initialBalance?: number;
}

export interface TreasuryTransaction {
  id: string;
  accountId: string; // Destination/Source account ID
  type: 'credit' | 'debit'; // Credit: Money In, Debit: Money Out
  amount: number;
  purpose: string; // Description/Memo of flow
  referenceId?: string; // Order ref, purchase ID, or expense ID
  timestamp: string;
  // Audit logs representation
  originalAccountId?: string;
  modifiedAt?: string;
  modifiedBy?: string;
  changeHistory?: string[]; // audit log details
}

export interface SupportChat {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  lastMessageText: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'followed_up' | 'closed';
}

export interface RolePermissions {
  orderProcess: boolean;
  accounts: boolean;
  productEdit: boolean;
  purchaseEntry: boolean;
  systemSettings: boolean;
}

export interface StaffRoleCategory {
  id: string;
  name: string;
  description?: string;
  roleKey: string;
  createdAt: string;
}

export interface SpecialDayReminder {
  id: string;
  name: string; // e.g. "Mom's Birthday"
  relation: string; // e.g. "Mother"
  date: string; // YYYY-MM-DD
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  autoReminded?: boolean;
}

export interface DatabaseState {
  users: UserRole[];
  rolePermissions?: Record<string, RolePermissions>;
  staffRoleCategories?: StaffRoleCategory[];
  categories: Category[];
  brands: Brand[];
  products: Product[];
  inventoryLogs: InventoryLog[];
  reviews: Review[];
  coupons: Coupon[];
  leads: Lead[];
  orders: Order[];
  currencies: CurrencySettings[];
  plugins: PluginSettings;
  appearance: AppearanceSettings;
  store: StoreSettings;
  serviceFees: ServiceFee[];
  pages: DynamicPage[];
  deliveryDistricts?: DeliveryDistrict[];
  deliveryGroups?: DeliveryGroup[];
  paymentGateways?: PaymentGateway[];
  supportChats?: SupportChat[];
  // Accounting records
  vendors?: Vendor[];
  purchaseEntries?: PurchaseEntry[];
  expenseEntries?: ExpenseEntry[];
  treasuryAccounts?: TreasuryAccount[];
  treasuryTransactions?: TreasuryTransaction[];
  complianceFooter?: ComplianceFooterConfig;
  deliveryTimeSlotSettings?: PreferredDeliveryTimeSlotSettings;
  // Dynamic Email Configuration & Logging
  smtpSettings?: SmtpSettings;
  emailTemplates?: EmailTemplate[];
  emailLogs?: EmailLog[];
  visitorTracks?: VisitorTrack[];
  customerAuthConfig?: CustomerAuthConfig;
  socialSchedules?: SocialMarketingSchedule[];
  socialConfig?: SocialMarketingSettings;
  aiBlogs?: AIBlog[];
  specialDayReminders?: SpecialDayReminder[];
}

export interface CustomerAuthConfig {
  enableGoogleLogin: boolean;
  enableGuestCheckout: boolean;
  enableAutoOrderLinking: boolean;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUrl: string;
  auth0Domain?: string;
  auth0ClientId?: string;
  matchOrdersByEmail: boolean;
  enableAutoMerge: boolean;
  enableAccountCreationOnLogin: boolean;
  allowDuplicateEmails: boolean;
  sessionTimeoutMinutes: number;
}

export interface VisitorTrack {
  id: string;
  ip?: string;
  country: string;
  countryCode: string;
  timestamp: string; // ISO string
  pageSlug: string; // e.g. "home", "product-id", etc.
  pageTitle: string; // human-readable page name
  browser?: string;
  os?: string;
  device?: 'Desktop' | 'Mobile' | 'Tablet';
  duration?: number; // duration in seconds
}

export interface DeliveryTimeSlot {
  id: string;
  name: string; // e.g. "Morning (9:00 AM - 12:00 PM)"
  startHour: number; // 24hr hour integer for preparation time cutoff (e.g. 9 for 9 AM)
  endHour: number; // 24hr hour integer (e.g. 12 for 12 PM)
  timeDisplay: string; // e.g. "9:00 AM - 12:00 PM"
  additionalChargeNPR: number; // Option A target fee
  sequence: number; // display priority
}

export interface PreferredDeliveryTimeSlotSettings {
  isEnabled: boolean;
  chargeType: 'fixed_per_slot' | 'flat';
  flatChargeNPR: number; // Option B target flat fee
  minPreparationHours: number; // minimum delay before slot
  enabledCityIds: string[]; // target delivery districts
  slots: DeliveryTimeSlot[];
}

export interface FooterLink {
  id: string;
  label: string;
  url: string;
}

export interface FooterLinkGroup {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface SocialMediaConfig {
  id: string;
  platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter';
  url: string;
  isEnabled: boolean;
}

export interface ComplianceFooterConfig {
  // Company Info
  registeredBusinessName: string;
  registrationNumber: string;
  panVatNumber: string;
  ecommerceNumber: string;
  establishmentDate?: string;
  regulatoryAuthority?: string;
  licenseNumber?: string;
  certificationInfo?: string;
  
  // Contact Info
  supportEmail: string;
  supportPhone: string;
  corporateEmail: string;
  corporatePhone: string;
  
  // Company Address
  registeredOfficeAddress: string;
  headOfficeAddress: string;
  outlets?: string;
  
  // Compliance Info
  complianceOfficerName: string;
  complianceOfficerMobile: string;
  complianceOfficerEmail: string;
  additionalComplianceDetails?: string;

  // Navigation columns
  footerGroups: FooterLinkGroup[];
  popularCategoriesEnabled: boolean;
  popularCategoryIds?: string[];
  
  // Social configs
  socials: SocialMediaConfig[];
  
  // Logo config
  logoUrl?: string;
  logoWidth?: number;

  // Footer theme colors
  footerBackgroundColor?: string;
  footerSecondaryColor?: string;
  footerTextColor?: string;
}

export interface SmtpSettings {
  isEnabled: boolean;
  gmailAddress: string;
  appPassword?: string;
  senderName: string;
  replyToEmail: string;
  notificationEmail?: string;
  notificationWhatsapp?: string;
  whatsappEnabled?: boolean;
}

export interface EmailTemplate {
  id: string; // 'confirmation' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  name: string;
  subject: string;
  body: string; // html template content
  logo?: string;
  footer?: string;
}

export interface EmailLog {
  id: string;
  orderId: string;
  recipientEmail: string;
  emailType: string; // e.g. 'Order Confirmation', 'Shipped Notifications'
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

export interface APIFieldBehavior {
  enabled: boolean;
  mandatory: boolean;
}

export interface APIIntegrationUser {
  id: string;
  integrationName: string;
  companyName: string;
  contactPerson: string;
  email: string;
  username: string;
  apiKey: string;
  apiSecret: string;
  status: 'active' | 'disabled';
  allowedProducts?: string[]; // Array of Product IDs
  allowedCities?: string[]; // Array of District IDs or names
  fieldConfig?: Record<string, APIFieldBehavior>;
  allowedIps?: string; // Comma-separated list of IP addresses
}

export interface APILog {
  id: string;
  timestamp: string;
  username: string;
  endpoint: string;
  ipAddress: string;
  requestPayload: string;
  responseStatus: number;
  responseBody: string;
  status: 'success' | 'error';
}

export interface ManualPaymentSetup {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrCode?: string;
  instructions: string;
  whatsAppNumber: string;
}

export interface SocialMarketingSchedule {
  id: string;
  productId?: string;
  productName?: string;
  productUrl?: string;
  caption: string;
  hashtags: string;
  scheduledTime: string; // ISO format
  platforms: string[]; // e.g. ['facebook', 'instagram', 'linkedin', 'twitter']
  status: 'scheduled' | 'shared' | 'cancelled';
  sharedAt?: string;
}

export interface SocialMarketingSettings {
  isEnabled: boolean;
  defaultHashtags: string;
  automaticGeneration: boolean;
  marketingMode: 'aggressive' | 'balanced' | 'relaxed';
  scheduledFrequencyHours: number;
}

export interface AIBlog {
  id: string;
  title: string;
  slug: string;
  subject: string;
  content: string; // Markdown or plain HTML
  seoKeywords: string;
  metaDescription: string;
  status: 'draft' | 'published';
  createdAt: string;
  author: string;
  imageUrl?: string; // custom cover/header image url
}


