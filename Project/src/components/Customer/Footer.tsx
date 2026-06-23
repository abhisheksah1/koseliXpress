import React from 'react';
import { DatabaseState, ComplianceFooterConfig } from '../../types';
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Scale, 
  FileCheck, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Twitter, 
  Globe, 
  Award,
  Video,
  ExternalLink 
} from 'lucide-react';

interface FooterProps {
  key?: string;
  state: DatabaseState;
  sectionData?: any; // Overrides from the Page Builder Footer section
}

export default function Footer({ state, sectionData }: FooterProps) {
  const isLight = state.appearance?.themeMode !== 'dark';
  const primaryTheme = state.appearance?.primaryColor || '#d11252';
  const secondaryTheme = state.appearance?.secondaryColor || '#492583';

  // Merge general compliance state with possible Page Builder section overrides
  const compliance: ComplianceFooterConfig = {
    ...(state.complianceFooter || {
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
      outlets: 'Kathmandu - New Road Outlet | Lalitpur - Balkumari Showroom',
      complianceOfficerName: 'Sabita Acharya',
      complianceOfficerMobile: '+977-9801354451',
      complianceOfficerEmail: 'sabita.acharya@koselixpress.com',
      additionalComplianceDetails: 'Compliant with prevailing AML/CFT legislation of Nepal.',
      footerGroups: [],
      popularCategoriesEnabled: true,
      socials: []
    }),
    ...(sectionData || {})
  };

  // Safe navigation properties
  const footerGroups = compliance.footerGroups && compliance.footerGroups.length > 0 
    ? compliance.footerGroups 
    : (state.complianceFooter?.footerGroups || []);

  const socials = compliance.socials && compliance.socials.length > 0 
    ? compliance.socials 
    : (state.complianceFooter?.socials || []);

  const logoUrl = compliance.logoUrl || state.appearance?.siteLogo;
  const logoWidth = compliance.logoWidth || 160;

  // Render Social icon dynamically
  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'twitter':
      case 'x':
        return <Twitter className="w-4 h-4" />;
      case 'tiktok':
        return <Video className="w-4 h-4" />; // Elegant substitute
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get active items to display under popular categories
  const activeCategories = state.categories.slice(0, 6);

  return (
    <footer 
      id="corporate-registry-compliance-footer"
      className={`border-t font-sans tracking-tight transition-colors duration-200 shrink-0 ${
        isLight 
          ? 'bg-[#FCF9F9] border-rose-100 text-slate-650' 
          : 'bg-[#080808] border-white/5 text-slate-400'
      }`}
    >
      {/* SECTION 1: Main Footer Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 text-left">
          
          {/* Column 1: Company Logo / Brand */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <div 
              onClick={handleLogoClick}
              className="cursor-pointer inline-block transition hover:opacity-90"
              style={{ maxWidth: `${logoWidth}px` }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={compliance.registeredBusinessName}
                  className="h-auto w-full object-contain max-h-16 rounded"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-sm rotate-45 flex items-center justify-center text-white font-serif italic font-bold shrink-0"
                    style={{ backgroundImage: `linear-gradient(to tr, ${primaryTheme}, ${secondaryTheme})` }}
                  >
                    <span className="-rotate-45 block">K</span>
                  </div>
                  <span className="font-extrabold tracking-widest text-[#050505] dark:text-white text-xs font-serif uppercase">
                    KoseXpress
                  </span>
                </div>
              )}
            </div>
            
            <p className={`text-xs leading-relaxed font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {state.appearance?.brandDescriptionStyle || 
                'Direct premium handwrapped gifting delivery networks serving Kathmandu, Lalitpur, Bhaktapur and global diaspora communities.'}
            </p>
          </div>

          {/* Column 2: About Company Links (First Group) */}
          <div className="space-y-4">
            <h4 
              className="font-extrabold uppercase tracking-wider text-[10px] font-mono border-b pb-2" 
              style={{ color: isLight ? primaryTheme : '#f59e0b', borderColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
            >
              {footerGroups[0]?.title || 'About Company'}
            </h4>
            <ul className="space-y-2 text-xs">
              {(footerGroups[0]?.links || [
                { id: '1', label: 'About Us', url: '/pages/about-us' },
                { id: '2', label: 'Contact Us', url: '/pages/contact-us' },
                { id: '3', label: 'Current Offers', url: '/pages/offers' },
                { id: '4', label: 'Careers', url: '/pages/careers' },
                { id: '5', label: 'Corporate Info', url: '/pages/corporate-info' }
              ]).map((link, idx) => (
                <li key={link.id || `col1-link-${idx}`}>
                  <a 
                    href={link.url}
                    className={`font-semibold hover:underline block transition-all ${
                      isLight ? 'text-slate-700 hover:text-rose-600' : 'text-slate-300 hover:text-amber-400'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Popular Categories (Dynamic Links) */}
          <div className="space-y-4">
            <h4 
              className="font-extrabold uppercase tracking-wider text-[10px] font-mono border-b pb-2" 
              style={{ color: isLight ? primaryTheme : '#f59e0b', borderColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
            >
              Popular Categories
            </h4>
            {compliance.popularCategoriesEnabled ? (
              <ul className="space-y-2 text-xs">
                {activeCategories.map((cat, idx) => (
                  <li key={cat.id || `footer-cat-${idx}`}>
                    <a 
                      href={`/category/${cat.id}`}
                      className={`font-semibold hover:underline block transition-all ${
                        isLight ? 'text-slate-700 hover:text-rose-600' : 'text-slate-300 hover:text-amber-400'
                      }`}
                    >
                      {cat.name} Links
                    </a>
                  </li>
                ))}
                <li>
                  <a 
                    href="/category/all" 
                    className={`font-bold hover:underline block transition-all ${
                      isLight ? 'text-rose-600' : 'text-amber-400'
                    }`}
                  >
                    Browse All Catalog →
                  </a>
                </li>
              </ul>
            ) : (
              <p className="text-[11px] italic font-medium">Categorized indexes disabled.</p>
            )}
          </div>

          {/* Column 4: Legal & Compliance Links (Second Group) */}
          <div className="space-y-4">
            <h4 
              className="font-extrabold uppercase tracking-wider text-[10px] font-mono border-b pb-2" 
              style={{ color: isLight ? primaryTheme : '#f59e0b', borderColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
            >
              {footerGroups[1]?.title || 'Legal & Compliance'}
            </h4>
            <ul className="space-y-2 text-xs">
              {(footerGroups[1]?.links || [
                { id: '11', label: 'Shipping Policy', url: '/pages/shipping-policy' },
                { id: '12', label: 'Refund Policy', url: '/pages/refund-policy' },
                { id: '13', label: 'Privacy Policy', url: '/pages/privacy-policy' },
                { id: '14', label: 'Terms of Service', url: '/pages/terms-of-service' },
                { id: '15', label: 'Return Policy', url: '/pages/return-policy' },
                { id: '16', label: 'AML/CFT Policy', url: '/pages/aml-cft-policy' },
                { id: '17', label: 'KYC Policy', url: '/pages/kyc-policy' },
                { id: '18', label: 'Disclaimer', url: '/pages/disclaimer' }
              ]).map((link, idx) => (
                <li key={link.id || `col-2-link-${idx}`}>
                  <a 
                    href={link.url}
                    className={`font-semibold hover:underline block transition-all ${
                      isLight ? 'text-slate-700 hover:text-rose-600' : 'text-slate-300 hover:text-amber-400'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Social Media */}
          <div className="space-y-4">
            <h4 
              className="font-extrabold uppercase tracking-wider text-[10px] font-mono border-b pb-2" 
              style={{ color: isLight ? primaryTheme : '#f59e0b', borderColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}
            >
              Social Channels
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {(socials.length > 0 ? socials : [
                { id: '1', platform: 'facebook', url: 'https://facebook.com/koselixpress', isEnabled: true },
                { id: '2', platform: 'instagram', url: 'https://instagram.com/koselixpress', isEnabled: true },
                { id: '3', platform: 'tiktok', url: 'https://tiktok.com/@koselixpress', isEnabled: true },
                { id: '4', platform: 'linkedin', url: 'https://linkedin.com/company/koselixpress', isEnabled: true }
              ])
                .filter(s => s.isEnabled)
                .map((social, idx) => (
                  <a
                    key={social.id || `social-${social.platform || idx}`}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-lg border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      isLight 
                        ? 'bg-white border-rose-100 hover:bg-rose-50 hover:border-rose-300 text-rose-650 hover:text-rose-800' 
                        : 'bg-[#0f0f0f] border-white/5 hover:bg-white/5 hover:border-amber-500/20 text-slate-300 hover:text-amber-400'
                    }`}
                    title={social.platform}
                  >
                    {renderSocialIcon(social.platform)}
                  </a>
                ))
              }
            </div>
            <p className="text-[10px] font-medium leading-normal opacity-85">
              Connect with our live wrapping workshops on social handles. Open globally.
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 2: Corporate Entity Registry & Compliance Information */}
      <div 
        className={`border-t border-b`}
        style={{ 
          borderColor: isLight ? 'rgba(209, 18, 82, 0.08)' : 'rgba(255,255,255,0.05)',
          backgroundColor: isLight ? 'rgba(209, 18, 82, 0.015)' : 'rgba(0,0,0,0.2)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-left text-[11px] leading-relaxed">
            
            {/* Box 1: Registered Business Information */}
            <div className="space-y-2.5">
              <span className="text-[9.5px] uppercase font-mono tracking-widest font-black flex items-center gap-1.5" style={{ color: isLight ? primaryTheme : '#f59e0b' }}>
                <Building className="w-3.5 h-3.5" /> Registered Entity
              </span>
              <div className="space-y-1">
                <p className={`font-black text-xs ${isLight ? 'text-slate-800' : 'text-white'}`}>
                  {compliance.registeredBusinessName}
                </p>
                <p className="font-medium">
                  Registration: <span className="font-mono font-bold">{compliance.registrationNumber}</span>
                </p>
                <div className="flex flex-col gap-1 mt-1 font-medium">
                  <span className="flex justify-between border-b pb-0.5 border-dashed border-slate-205 dark:border-white/5">
                    <span>PAN / VAT:</span>
                    <span className="font-mono font-bold">{compliance.panVatNumber}</span>
                  </span>
                  <span className="flex justify-between">
                    <span>E-Commerce No:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{compliance.ecommerceNumber}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Box 2: Contact Information */}
            <div className="space-y-2.5">
              <span className="text-[9.5px] uppercase font-mono tracking-widest font-black flex items-center gap-1.5" style={{ color: isLight ? primaryTheme : '#f59e0b' }}>
                <Mail className="w-3.5 h-3.5" /> Core Contacts
              </span>
              <div className="space-y-1.5 font-medium">
                <p className="flex items-center gap-1">
                  <span className="opacity-75">Support Email:</span>
                  <a href={`mailto:${compliance.supportEmail}`} className={`underline break-all font-mono font-bold ${isLight ? 'text-slate-800 hover:text-rose-700' : 'text-slate-200 hover:text-amber-400'}`}>
                    {compliance.supportEmail}
                  </a>
                </p>
                <p className="flex items-center gap-1">
                  <span className="opacity-75">Call Support:</span>
                  <span className="font-mono font-bold">{compliance.supportPhone}</span>
                </p>
                {compliance.corporateEmail && (
                  <p className="flex items-center gap-1">
                    <span className="opacity-75">Corporate Email:</span>
                    <a href={`mailto:${compliance.corporateEmail}`} className={`underline break-all font-mono font-semibold ${isLight ? 'text-slate-800 hover:text-rose-700' : 'text-slate-200 hover:text-amber-400'}`}>
                      {compliance.corporateEmail}
                    </a>
                  </p>
                )}
                {compliance.corporatePhone && (
                  <p className="flex items-center gap-1">
                    <span className="opacity-75">Corporate Phone:</span>
                    <span className="font-mono font-semibold">{compliance.corporatePhone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Box 3: Company Address */}
            <div className="space-y-2.5">
              <span className="text-[9.5px] uppercase font-mono tracking-widest font-black flex items-center gap-1.5" style={{ color: isLight ? primaryTheme : '#f59e0b' }}>
                <MapPin className="w-3.5 h-3.5" /> Official Premises
              </span>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-350 font-medium">
                <div>
                  <span className={`block text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-amber-500/80'}`}>Registered Office:</span>
                  <p className="leading-tight mt-0.5">{compliance.registeredOfficeAddress}</p>
                </div>
                <div>
                  <span className={`block text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-amber-500/80'}`}>Head Office Location:</span>
                  <p className="leading-tight mt-0.5">{compliance.headOfficeAddress}</p>
                </div>
                {compliance.outlets && (
                  <div>
                    <span className={`block text-[9px] font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-amber-500/80'}`}>Operational Outlets:</span>
                    <p className="leading-tight text-[10px] italic mt-0.5">{compliance.outlets}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Box 4: Compliance Officer Details */}
            <div 
              className="space-y-2.5 p-3.5 rounded-xl border flex flex-col justify-between"
              style={{ 
                backgroundColor: isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: isLight ? 'rgba(209, 18, 82, 0.08)' : 'rgba(255,255,255,0.05)'
              }}
            >
              <div>
                <span className="text-[9.5px] uppercase font-mono tracking-widest font-black flex items-center gap-1.5" style={{ color: isLight ? primaryTheme : '#f59e0b' }}>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Compliance Officer
                </span>
                <div className="mt-2 space-y-1 text-[10px] leading-snug">
                  <p className={`font-extrabold text-xs ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                    {compliance.complianceOfficerName}
                  </p>
                  <p className="font-medium">
                    Mobile: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{compliance.complianceOfficerMobile}</span>
                  </p>
                  <p className="font-mono truncate font-medium">
                    Email: <a href={`mailto:${compliance.complianceOfficerEmail}`} className="underline hover:text-[#d11252]">{compliance.complianceOfficerEmail}</a>
                  </p>
                </div>
              </div>
              {compliance.additionalComplianceDetails && (
                <p className="text-[9.5px] leading-snug text-slate-500 italic mt-3 font-medium border-t border-dashed pt-1.5 border-slate-200 dark:border-white/5">
                  {compliance.additionalComplianceDetails}
                </p>
              )}
            </div>

            {/* Box 5: Additional Corporate Info */}
            <div className="space-y-2.5">
              <span className="text-[9.5px] uppercase font-mono tracking-widest font-black flex items-center gap-1.5" style={{ color: isLight ? primaryTheme : '#f59e0b' }}>
                <Award className="w-3.5 h-3.5" /> Authority Licensing
              </span>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-350 font-medium">
                {compliance.regulatoryAuthority && (
                  <div>
                    <span className="block text-[8.5px] font-black uppercase text-slate-505">Regulating Board:</span>
                    <p className="leading-tight text-[10px]">{compliance.regulatoryAuthority}</p>
                  </div>
                )}
                {compliance.licenseNumber && (
                  <p className="text-[10px]">
                    License Number: <strong className="font-mono">{compliance.licenseNumber}</strong>
                  </p>
                )}
                {compliance.certificationInfo && (
                  <div className="flex items-start gap-1 p-1 bg-slate-100/50 dark:bg-white/[0.02] rounded border border-slate-200/40 dark:border-white/5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[9.5px] leading-tight text-slate-500 dark:text-slate-400">{compliance.certificationInfo}</span>
                  </div>
                )}
                {compliance.establishmentDate && (
                  <p className="text-[9px] font-sans font-bold opacity-75">
                    Established Date: {new Date(compliance.establishmentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION 3: Copyright Area */}
      <div 
        className={`text-center py-6 text-[10.5px] font-semibold tracking-wide ${
          isLight ? 'bg-white text-slate-500' : 'bg-[#030303] text-slate-550'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-left font-medium">
            © 2023–{new Date().getFullYear()} <span className="font-bold text-slate-800 dark:text-slate-200">{compliance.registeredBusinessName || state.store.storeName}</span>. All Rights Reserved.
          </p>
          <div className="flex items-center gap-1.5 text-[9px] uppercase font-mono tracking-widest text-slate-400">
            <span>Corporate Compliance Seal Verified</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
      </div>

    </footer>
  );
}
