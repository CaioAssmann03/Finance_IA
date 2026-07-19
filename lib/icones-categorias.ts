import {
  Utensils,
  ShoppingCart,
  Car,
  Home,
  FileText,
  HeartPulse,
  BookOpen,
  PartyPopper,
  Repeat,
  Shirt,
  Sparkles,
  PawPrint,
  MoreHorizontal,
  Wallet,
  Laptop,
  TrendingUp,
  Gift,
  Tag,
  type LucideIcon,
} from "lucide-react";

const MAPA_ICONES: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  "file-text": FileText,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  "party-popper": PartyPopper,
  repeat: Repeat,
  shirt: Shirt,
  sparkles: Sparkles,
  "paw-print": PawPrint,
  "more-horizontal": MoreHorizontal,
  wallet: Wallet,
  laptop: Laptop,
  "trending-up": TrendingUp,
  gift: Gift,
};

/** Devolve o componente de ícone do Lucide correspondente ao nome salvo na
 * categoria; se não encontrar (categoria antiga sem ícone, ou nome inválido),
 * cai num ícone genérico de etiqueta. */
export function iconeDaCategoria(nomeIcone: string | null | undefined): LucideIcon {
  if (!nomeIcone) return Tag;
  return MAPA_ICONES[nomeIcone] ?? Tag;
}
