import React from 'react';
import {
  UtensilsCrossed, ShoppingCart, ShoppingBag, Briefcase, Scissors, Wrench,
  BookOpen, PartyPopper, Car, HandHeart, Gift, Landmark, BookMarked, Store,
} from 'lucide-react';

// One real line-icon per category, replacing the emoji set -- rendered at a
// fixed size/stroke so every card in the directory reads as one consistent
// icon system instead of whatever a given emoji font happens to draw.
const CATEGORY_ICON_COMPONENTS = {
  restaurant: UtensilsCrossed,
  grocery: ShoppingCart,
  retail: ShoppingBag,
  professional_services: Briefcase,
  health_beauty: Scissors,
  home_services: Wrench,
  education: BookOpen,
  entertainment: PartyPopper,
  automotive: Car,
  nonprofit: HandHeart,
  gemach: Gift,
  shul: Landmark,
  kollel: BookMarked,
  other: Store,
};

export default function CategoryIcon({ category, size = 22, ...rest }) {
  const Cmp = CATEGORY_ICON_COMPONENTS[category] || Store;
  return <Cmp size={size} strokeWidth={1.75} {...rest} />;
}
