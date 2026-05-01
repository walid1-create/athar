/** Flattened product row for listings and legacy clients */
export type UnifiedProduct = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  price: number;
  discountPrice: number | null;
  images: string[];
  category: string;
  categoryAr: string | null;
};
