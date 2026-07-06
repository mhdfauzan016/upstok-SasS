/** Response shape for the Category module. */
export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  position: number;
  productCount: number;
}
