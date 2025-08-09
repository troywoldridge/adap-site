export interface SinaliteOrderItem {
  productId: number | string;
  options: (number | string)[];
  files?: { type: string; url: string }[];
  extra?: string;
}

export interface SinaliteOrderShippingInfo {
  ShipFName: string;
  ShipLName: string;
  ShipEmail: string;
  ShipAddr: string;
  ShipAddr2?: string;
  ShipCity: string;
  ShipState: string;
  ShipZip: string;
  ShipCountry: string;
  ShipPhone: string;
  ShipMethod?: string;
}

export interface SinaliteOrderBillingInfo {
  BillFName: string;
  BillLName: string;
  BillEmail: string;
  BillAddr: string;
  BillAddr2?: string;
  BillCity: string;
  BillState: string;
  BillZip: string;
  BillCountry: string;
  BillPhone: string;
}

export interface SinaliteShippingEstimateRequest {
  items: SinaliteOrderItem[];
  shippingInfo: SinaliteOrderShippingInfo;
  billingInfo: SinaliteOrderBillingInfo;
  notes?: string;
}

export interface SinaliteShippingMethod {
  carrier: string;
  service: string;
  price: number;
  available: boolean;
}
