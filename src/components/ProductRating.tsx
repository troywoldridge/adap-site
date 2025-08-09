import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

interface Props {
  rating: number; // e.g. 4.7
  count?: number;
}

export default function ProductRating({ rating, count }: Props) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (rating >= i + 1) return <FaStar key={i} className="text-yellow-400" />;
    if (rating > i && rating < i + 1) return <FaStarHalfAlt key={i} className="text-yellow-400" />;
    return <FaRegStar key={i} className="text-yellow-400" />;
  });

  return (
    <div className="flex items-center gap-1 mb-2">
      {stars}
      {count !== undefined && (
        <span className="text-xs text-gray-500 ml-1">({count} Reviews)</span>
      )}
    </div>
  );
}
