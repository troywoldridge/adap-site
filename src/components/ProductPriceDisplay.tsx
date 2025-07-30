type ProductPriceDisplayProps = {
  price: number | null;
};

export default function ProductPriceDisplay({ price }: ProductPriceDisplayProps) {
  return (
    <div className="text-xl font-bold mt-4">
      {price != null ? `Price: $${price}` : 'Select all options to see price'}
    </div>
  );
}
