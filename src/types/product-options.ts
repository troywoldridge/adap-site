export interface ProductOption {
  id: number;
  name: string;
  groupId: number;
  group: string;
}

export interface ProductOptionGroup {
  groupId: number;
  group: string;
  options: ProductOption[];
}
