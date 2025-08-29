"use client";

export default function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div aria-label={`${v} out of 5`} className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          className={i < v ? "fill-yellow-500" : "fill-gray-300"}
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.053 3.24a1 1 0 00.95.69h3.405c.967 0 1.371 1.24.588 1.81l-2.756 2.003a1 1 0 00-.364 1.118l1.053 3.24c.3.921-.755 1.688-1.54 1.118l-2.756-2.003a1 1 0 00-1.176 0l-2.756 2.003c-.784.57-1.838-.197-1.54-1.118l1.053-3.24a1 1 0 00-.364-1.118L2.453 8.667c-.783-.57-.379-1.81.588-1.81h3.405a1 1 0 00.95-.69l1.053-3.24z"/>
        </svg>
      ))}
    </div>
  );
}
