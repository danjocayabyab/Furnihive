export type Category = {
  label: string;
  meta: string;
  image: string;
};

export type FeaturedProduct = {
  id: number;
  title: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  image: string;
  outOfStock?: boolean;
};

export const categories: Category[] = [
  {
    label: 'Living Room',
    meta: '134 items',
    image:
      'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Bedroom',
    meta: '86 items',
    image:
      'https://images.unsplash.com/photo-1505691723518-36a5ac3b2d86?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Dining',
    meta: '82 items',
    image:
      'https://images.unsplash.com/photo-1505693314120-0d443867891c?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Office',
    meta: '45 items',
    image:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1200&auto=format&fit=crop',
  },
];

export const featured: FeaturedProduct[] = [
  {
    id: 1,
    title: 'Modern Sectional Sofa',
    price: 45999,
    oldPrice: 52999,
    rating: 4.8,
    reviews: 127,
    badge: 'NEW',
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Solid Wood Dining Set',
    price: 35500,
    oldPrice: 42000,
    rating: 4.9,
    reviews: 89,
    badge: '15% OFF',
    image:
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Premium Bed Frame',
    price: 28999,
    oldPrice: 34999,
    rating: 4.7,
    reviews: 203,
    badge: '17% OFF',
    image:
      'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'Executive Office Desk',
    price: 22500,
    oldPrice: 28000,
    rating: 4.6,
    reviews: 156,
    badge: '20% OFF',
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop',
  },
];
