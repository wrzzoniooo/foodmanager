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
  Snowflake,
  Soup,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { Cheese } from './CheeseIcon';
import type { CategoryId, Place } from './types';

/** Gdzie zwykle trzyma się produkt z danej kategorii (gdy nie pytamy użytkownika). */
export function defaultPlaceFor(category: CategoryId): Place {
  return ['nabial', 'sery', 'mieso', 'warzywa'].includes(category) ? 'fridge' : 'pantry';
}

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  Icon: LucideIcon;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'pieczywo', label: 'Pieczywo', Icon: Croissant },
  { id: 'nabial', label: 'Nabiał', Icon: Milk },
  { id: 'sery', label: 'Sery', Icon: Cheese },
  { id: 'mieso', label: 'Mięso i wędliny', Icon: Beef },
  { id: 'warzywa', label: 'Warzywa', Icon: Carrot },
  { id: 'owoce', label: 'Owoce', Icon: Apple },
  { id: 'sypkie', label: 'Sypkie i makarony', Icon: Wheat },
  { id: 'konserwy', label: 'Konserwy i gotowe dania', Icon: Soup },
  { id: 'sosy', label: 'Sosy, oleje i przyprawy', Icon: Droplet },
  { id: 'napoje', label: 'Napoje', Icon: CupSoda },
  { id: 'mrozonki', label: 'Mrożonki', Icon: Snowflake },
  { id: 'slodycze', label: 'Słodycze i przekąski', Icon: Candy },
  { id: 'inne', label: 'Inne', Icon: Package },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryInfo> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryInfo>;
