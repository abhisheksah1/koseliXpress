import React from 'react';
import { DatabaseState, ComplianceFooterConfig } from '../../types';
import {
  Building,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Award,
  FileCheck,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Globe,
  Video,
  Gift,
  ArrowUpRight,
  Heart,
} from 'lucide-react';

interface FooterProps {
  key?: string;
  state: DatabaseState;
  sectionData?: Record<string, unknown>;
}

const DEFAULT_ABOUT_LINKS = [
  { id: 'a1', label: 'About Us', url: '/page/about' },
  { id: 'a2', label: 'Contact', url: '/page/contact' },
  { id: 'a3', label: 'Offers', url: '/page/offers' },
  { id: 'a4', label: 'Blog & Guides', url: '/blog' },
];

const DEFAULT_LEGAL_LINKS = [
  { id: 'l1', label: 'Shipping Policy', url: '/page/shipping-policy' },
  { id: 'l2', label: 'Refund Policy', url: '/page/refund-policy' },
  { id: 'l3', label: 'Privacy Policy', url: '/page/privacy-policy' },
  { id: 'l4', label: 'Terms of Service', url: '/page/terms-of-service' },
];

export default function Footer({ state, sectionData }: FooterProps) {
  const primary = state.appearance?.primaryColor || '#E91E63';
  const secondary = state.appearance?.secondaryColor || '#C2185B';
  const storeName = state.store?.storeName || 'Koseli Xpress';
  const slogan = state.appearance?.slogan || 'Premium gifting, delivered with care';

  const compliance: ComplianceFooterConfig = {
    ...(state.complianceFooter || {}),
    ...(sectionData || {}),
  } as ComplianceFooterConfig;

  const footerGroups = compliance.footerGroups?.length ? compliance.footerGroups : [];
  const aboutLinks = footerGroups[0]?.links?.length ? footerGroups[0].links : DEFAULT_ABOUT_LINKS;
  const legalLinks = footerGroups[1]?.links?.length ? footerGroups[1].links : DEFAULT_LEGAL_LINKS;
  const aboutTitle = footerGroups[0]?.title || 'Company';
  const legalTitle = footerGroups[1]?.title || 'Policies';

  const socials = (compliance.socials?.length ? compliance.socials : [
    { id: 's1', platform: 'facebook', url: '#', isEnabled: true },
    { id: 's2', platform: 'instagram', url: '#', isEnabled: true },
    { id: 's3', platform: 'tiktok', url: '#', isEnabled: true },
  ]).filter(s => s.isEnabled);

  const logoUrl = compliance.logoUrl || state.appearance?.siteLogo;
  const logoWidth = compliance.logoWidth || 140;

  const supportEmail = compliance.supportEmail || state.store?.supportEmail;
  const supportPhone = compliance.supportPhone || state.store?.supportPhone;
  const businessName = compliance.registeredBusinessName || storeName;

  const activeCategories = state.categories.filter(c => c.name).slice(0, 5);

  const hasCompliance =
    compliance.registrationNumber ||
    compliance.panVatNumber ||
    compliance.registeredOfficeAddress ||
    compliance.complianceOfficerName;

  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'twitter':
      case 'x': return <Twitter className="w-4 h-4" />;
      case 'tiktok': return <Video className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      className="group flex items-center gap-1 text-sm text-white/65 hover:text-white transition-colors duration-200"
    >
      <span>{children}</span>
      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-60 transition-all" />
    </a>
  );

  return (
    <footer id="site-footer" className="relative mt-auto font-sans text-white overflow-hidden">
      {/* Gradient accent line */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${primary})` }} />

      {/* Main footer body */}
      <div
        className="relative"
        style={{
          background: 'linear-gradient(180deg, #1a0810 0%, #140810 50%, #0f060c 100%)',
        }}
      >
        {/* Decorative mesh */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 10% 20%, rgba(233,30,99,0.18), transparent 50%), radial-gradient(ellipse 40% 30% at 90% 60%, rgba(233,30,99,0.1), transparent 45%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

            {/* Brand column */}
            <div className="lg:col-span-4 space-y-6">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-block text-left transition opacity-95 hover:opacity-100"
                style={{ maxWidth: logoWidth }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={businessName}
                    className="h-auto w-full object-contain max-h-14 brightness-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
                    >
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-display text-2xl italic font-semibold tracking-tight text-white">{storeName}</p>
                      <p className="text-[11px] text-white/45 tracking-widest uppercase">{slogan}</p>
                    </div>
                  </div>
                )}
              </button>

              <p className="text-sm text-white/55 leading-relaxed max-w-sm">
                {state.appearance?.brandDescriptionStyle ||
                  'Nepal\'s premium gifting destination — handcrafted hampers, fresh flowers, and gourmet treats delivered with elegance.'}
              </p>

              {/* Contact chips */}
              <div className="flex flex-col gap-2.5">
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="inline-flex items-center gap-2.5 text-sm text-white/70 hover:text-white transition group"
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-white/20 transition">
                      <Mail className="w-3.5 h-3.5" style={{ color: primary }} />
                    </span>
                    {supportEmail}
                  </a>
                )}
                {supportPhone && (
                  <a
                    href={`tel:${supportPhone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2.5 text-sm text-white/70 hover:text-white transition group"
                  >
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-white/20 transition">
                      <Phone className="w-3.5 h-3.5" style={{ color: primary }} />
                    </span>
                    {supportPhone}
                  </a>
                )}
                {state.store?.address && (
                  <div className="inline-flex items-start gap-2.5 text-sm text-white/55">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: primary }} />
                    </span>
                    <span className="leading-relaxed">{state.store.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Link columns */}
            <div className="lg:col-span-2 space-y-5">
              <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">{aboutTitle}</h4>
              <ul className="space-y-3">
                {aboutLinks.map((link, idx) => (
                  <li key={link.id || `about-${idx}`}>
                    <FooterLink href={link.url}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-5">
              <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">{legalTitle}</h4>
              <ul className="space-y-3">
                {legalLinks.map((link, idx) => (
                  <li key={link.id || `legal-${idx}`}>
                    <FooterLink href={link.url}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories + Social */}
            <div className="lg:col-span-4 space-y-8">
              {compliance.popularCategoriesEnabled !== false && (
                <div className="space-y-5">
                  <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">Shop</h4>
                  {activeCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeCategories.map((cat, idx) => (
                        <a
                          key={cat.id || idx}
                          href={`/category/${cat.slug || cat.id}`}
                          className="px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/10 transition duration-200"
                        >
                          {cat.name}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 italic">Categories will appear here once added in Admin.</p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">Follow Us</h4>
                <div className="flex flex-wrap gap-2.5">
                  {socials.map((social, idx) => (
                    <a
                      key={social.id || idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={social.platform}
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-white/70 hover:text-white transition duration-300 hover:scale-105"
                      style={{ ['--hover-bg' as string]: primary }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      }}
                    >
                      {renderSocialIcon(social.platform)}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance strip — only when configured */}
        {hasCompliance && (
          <div className="relative border-t border-white/8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/40">Corporate & Compliance</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(compliance.registeredBusinessName || compliance.registrationNumber) && (
                  <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/8 space-y-2">
                    <div className="flex items-center gap-2 text-white/50">
                      <Building className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Registered Entity</span>
                    </div>
                    {compliance.registeredBusinessName && (
                      <p className="text-sm font-semibold text-white/90">{compliance.registeredBusinessName}</p>
                    )}
                    {compliance.registrationNumber && (
                      <p className="text-xs text-white/50">Reg: <span className="font-mono text-white/70">{compliance.registrationNumber}</span></p>
                    )}
                    {compliance.panVatNumber && (
                      <p className="text-xs text-white/50">PAN/VAT: <span className="font-mono text-white/70">{compliance.panVatNumber}</span></p>
                    )}
                  </div>
                )}

                {(compliance.registeredOfficeAddress || compliance.headOfficeAddress) && (
                  <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/8 space-y-2">
                    <div className="flex items-center gap-2 text-white/50">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Office</span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {compliance.registeredOfficeAddress || compliance.headOfficeAddress}
                    </p>
                    {compliance.outlets && (
                      <p className="text-[11px] text-white/40 italic">{compliance.outlets}</p>
                    )}
                  </div>
                )}

                {compliance.complianceOfficerName && (
                  <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/8 space-y-2">
                    <div className="flex items-center gap-2 text-white/50">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Compliance Officer</span>
                    </div>
                    <p className="text-sm font-semibold text-white/90">{compliance.complianceOfficerName}</p>
                    {compliance.complianceOfficerMobile && (
                      <p className="text-xs text-white/50">{compliance.complianceOfficerMobile}</p>
                    )}
                    {compliance.complianceOfficerEmail && (
                      <a href={`mailto:${compliance.complianceOfficerEmail}`} className="text-xs text-white/50 hover:text-white underline">
                        {compliance.complianceOfficerEmail}
                      </a>
                    )}
                  </div>
                )}

                {(compliance.regulatoryAuthority || compliance.certificationInfo) && (
                  <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/8 space-y-2">
                    <div className="flex items-center gap-2 text-white/50">
                      <Award className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Licensing</span>
                    </div>
                    {compliance.regulatoryAuthority && (
                      <p className="text-xs text-white/55 leading-relaxed">{compliance.regulatoryAuthority}</p>
                    )}
                    {compliance.certificationInfo && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-white/45">{compliance.certificationInfo}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="border-t border-white/8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-white/40 text-center sm:text-left">
              © {new Date().getFullYear()} <span className="text-white/70 font-medium">{businessName}</span>. All rights reserved.
            </p>
            <p className="flex items-center gap-1.5 text-xs text-white/35">
              Crafted with <Heart className="w-3 h-3" style={{ color: primary }} fill={primary} /> in Nepal
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
