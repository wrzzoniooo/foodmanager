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
  Triangle,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId } from './types';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  Icon: LucideIcon;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'pieczywo', label: 'Pieczywo', Icon: Croissant },
  { id: 'nabial', label: 'Nabiał', Icon: Milk },
  { id: 'sery', label: 'Sery', Icon: Triangle },
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
