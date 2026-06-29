import {
  LayoutTemplate,
  Image,
  Images,
  Play,
  Grid3X3,
  ShoppingBag,
  Type,
  HelpCircle,
  Star,
  MapPin,
  Code,
  Clock,
  PanelBottom,
  Shield,
  Sparkles,
  Megaphone,
  MousePointerClick,
  LucideIcon,
} from 'lucide-react';
import { CustomPageSection } from '../../types';

export type SectionType = CustomPageSection['type'];

export interface SectionMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export const SECTION_META: Record<SectionType, SectionMeta> = {
  banner: { label: 'Hero Banner', description: 'Full-width hero with image & CTA', icon: LayoutTemplate, accent: 'rose' },
  slider: { label: 'Image Slider', description: 'Rotating carousel slides', icon: Images, accent: 'violet' },
  image_content: { label: 'Image + Content', description: 'Split layout with text', icon: Image, accent: 'sky' },
  video: { label: 'Video Embed', description: 'YouTube promo block', icon: Play, accent: 'red' },
  categories_grid: { label: 'Categories Grid', description: 'Browse by occasion', icon: Grid3X3, accent: 'amber' },
  products_grid: { label: 'Products Grid', description: 'Featured product picks', icon: ShoppingBag, accent: 'emerald' },
  delivery_countdown: { label: 'Delivery Countdown', description: 'Cutoff timer by zone', icon: Clock, accent: 'orange' },
  trust_strip: { label: 'Trust Strip', description: 'Icon cards for USPs', icon: Shield, accent: 'teal' },
  features: { label: 'Features Grid', description: 'Three-column highlights', icon: Sparkles, accent: 'indigo' },
  cta_band: { label: 'CTA Band', description: 'Gradient call-to-action', icon: Megaphone, accent: 'pink' },
  text: { label: 'Text Block', description: 'Headings & paragraphs', icon: Type, accent: 'slate' },
  faq: { label: 'FAQ Accordion', description: 'Questions & answers', icon: HelpCircle, accent: 'cyan' },
  reviews: { label: 'Testimonials', description: 'Customer review cards', icon: Star, accent: 'yellow' },
  google_review: { label: 'Google Reviews', description: 'Maps review carousel', icon: MapPin, accent: 'blue' },
  code_embed: { label: 'Custom Code', description: 'HTML / iframe embeds', icon: Code, accent: 'zinc' },
  footer_builder: { label: 'Footer Builder', description: 'Compliance footer block', icon: PanelBottom, accent: 'stone' },
  button: { label: 'Button CTA', description: 'Standalone action button', icon: MousePointerClick, accent: 'rose' },
};

export interface BlockCategory {
  id: string;
  title: string;
  blocks: SectionType[];
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: 'hero',
    title: 'Hero & Media',
    blocks: ['banner', 'slider', 'video', 'image_content'],
  },
  {
    id: 'commerce',
    title: 'Commerce',
    blocks: ['categories_grid', 'products_grid', 'delivery_countdown'],
  },
  {
    id: 'trust',
    title: 'Trust & Conversion',
    blocks: ['trust_strip', 'features', 'cta_band', 'reviews', 'google_review', 'button'],
  },
  {
    id: 'content',
    title: 'Content',
    blocks: ['faq', 'code_embed', 'footer_builder'],
  },
];

export const TEXT_BLOCK_VARIANTS = [
  { size: 'h1' as const, label: 'H1 Headline', hint: 'Primary SEO heading' },
  { size: 'h2' as const, label: 'H2 Heading', hint: 'Section heading' },
  { size: 'h3' as const, label: 'H3 Subheading', hint: 'Nested heading' },
  { size: 'p' as const, label: 'Paragraph', hint: 'Body text block' },
];

export function getSectionLabel(type: SectionType): string {
  return SECTION_META[type]?.label || type.replace(/_/g, ' ');
}

export function getPagePreviewPath(slug: string): string {
  if (slug === 'home') return '/home';
  return `/page/${slug}`;
}

export const ACCENT_STYLES: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', iconBg: 'bg-rose-100 text-rose-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', iconBg: 'bg-violet-100 text-violet-600' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', iconBg: 'bg-sky-100 text-sky-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-100 text-red-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100 text-orange-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', iconBg: 'bg-teal-100 text-teal-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100 text-indigo-600' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', iconBg: 'bg-pink-100 text-pink-600' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', iconBg: 'bg-slate-100 text-slate-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', iconBg: 'bg-cyan-100 text-cyan-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', iconBg: 'bg-yellow-100 text-yellow-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-600' },
  zinc: { bg: 'bg-zinc-50', border: 'border-zinc-200', text: 'text-zinc-700', iconBg: 'bg-zinc-100 text-zinc-600' },
  stone: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-700', iconBg: 'bg-stone-100 text-stone-600' },
};
