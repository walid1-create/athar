/** Flattened product row for listings and legacy clients */
export type UnifiedProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  category: string | null;
};
