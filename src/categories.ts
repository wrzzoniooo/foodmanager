import {
  Apple,
  Beef,
  Candy,
  Carrot,
  Croissant,
  CupSoda,
  Droplet,
  Milk,
  Package,
  Popcorn,
  Snowflake,
  Soup,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { Cheese } from './CheeseIcon';
import type { CategoryId, Place } from './types';

/** Gdzie zwykle trzyma się produkt z danej kategorii (gdy nie pytamy użytkownika). */
export function defaultPlaceFor(category: CategoryId): Place {
  return ['nabial', 'sery', 'mieso', 'warzywa', 'mrozonki'].includes(category) ? 'fridge' : 'pantry';
}

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  /** Krótka nazwa do filtrów i przycisków, gdy pełna jest długa. */
  short: string;
  Icon: LucideIcon;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'pieczywo', label: 'Pieczywo', short: 'Pieczywo', Icon: Croissant },
  { id: 'nabial', label: 'Nabiał', short: 'Nabiał', Icon: Milk },
  { id: 'sery', label: 'Sery', short: 'Sery', Icon: Cheese },
  { id: 'mieso', label: 'Mięso i wędliny', short: 'Mięso', Icon: Beef },
  { id: 'warzywa', label: 'Warzywa', short: 'Warzywa', Icon: Carrot },
  { id: 'owoce', label: 'Owoce', short: 'Owoce', Icon: Apple },
  { id: 'sypkie', label: 'Sypkie i makarony', short: 'Sypkie', Icon: Wheat },
  { id: 'konserwy', label: 'Konserwy i gotowe dania', short: 'Konserwy', Icon: Soup },
  { id: 'sosy', label: 'Sosy, oleje i przyprawy', short: 'Sosy', Icon: Droplet },
  { id: 'napoje', label: 'Napoje', short: 'Napoje', Icon: CupSoda },
  { id: 'mrozonki', label: 'Mrożonki', short: 'Mrożonki', Icon: Snowflake },
  { id: 'slodycze', label: 'Słodycze', short: 'Słodycze', Icon: Candy },
  { id: 'slone', label: 'Słone przekąski', short: 'Słone', Icon: Popcorn },
  { id: 'inne', label: 'Inne', short: 'Inne', Icon: Package },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryInfo>;
