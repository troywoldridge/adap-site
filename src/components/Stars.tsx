import { useState } from "react";

interface StarsProps {
  rating: number; // Current rating (e.g. 4.2)
  max?: number;
  size?: number;
  onRate?: (value: number) => void; // Called when user rates
  editable?: boolean;
  label?: string; // For "Your Rating: X/5"
}

export default function Stars({
  rating,
  max = 5,
  size = 28,
  onRate,
  editable = false,
  label,
}: StarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [burstIndex, setBurstIndex] = useState<number | null>(null);
  const display = hovered !== null ? hovered : rating;

  function handleRate(starValue: number) {
    setBurstIndex(starValue - 1);
    if (onRate) onRate(starValue);
    setTimeout(() => setBurstIndex(null), 550); // Reset burst after animation
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "start" }}>
      <span
        style={{ display: "inline-flex", gap: 3, cursor: editable ? "pointer" : "default" }}
        role={editable ? "radiogroup" : undefined}
        aria-label={
          editable
            ? `Select rating (current ${rating} out of ${max})`
            : `${rating} out of ${max} stars`
        }
      >
        {Array.from({ length: max }).map((_, i) => {
          const starValue = i + 1;
          const filled = display >= starValue ? 1 : display > i ? display - i : 0;
          const isBurst = burstIndex === i;

          return (
            <span
              key={i}
              role={editable ? "radio" : undefined}
              aria-checked={editable ? display === starValue : undefined}
              tabIndex={editable ? 0 : -1}
              onMouseEnter={editable ? () => setHovered(starValue) : undefined}
              onMouseLeave={editable ? () => setHovered(null) : undefined}
              onClick={editable ? () => handleRate(starValue) : undefined}
              onKeyDown={
                editable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") handleRate(starValue);
                    }
                  : undefined
              }
              style={{
                outline: editable ? "none" : undefined,
                transition: "transform .18s cubic-bezier(.4,0,.2,1)",
                transform:
                  hovered === starValue
                    ? "scale(1.15)"
                    : isBurst
                    ? "scale(1.35)"
                    : "none",
                position: "relative",
                zIndex: isBurst ? 2 : 1,
                animation: isBurst
                  ? "star-burst .55s cubic-bezier(.42,0,0,1.22) both"
                  : undefined,
              }}
            >
              <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                style={{
                  display: "block",
                  filter: filled ? "drop-shadow(0 2px 5px #ffd70044)" : undefined,
                  transition: "filter .15s",
                }}
                aria-hidden="true"
              >
                <defs>
                  {filled > 0 && filled < 1 && (
                    <linearGradient id={`star-partial-${i}`}>
                      <stop offset={`${filled * 100}%`} stopColor="#FFD700" />
                      <stop offset={`${filled * 100}%`} stopColor="#e5e7eb" />
                    </linearGradient>
                  )}
                </defs>
                <polygon
                  points="12,2 15,8.5 22,9.3 17,14.2 18.5,21 12,17.6 5.5,21 7,14.2 2,9.3 9,8.5"
                  fill={
                    filled === 1
                      ? "#FFD700"
                      : filled > 0
                      ? `url(#star-partial-${i})`
                      : "#e5e7eb"
                  }
                  stroke="#D1A100"
                  strokeWidth="1"
                />
                {/* Burst effect (radial lines) */}
                {isBurst && (
                  <g>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <line
                        key={j}
                        x1="12"
                        y1="4"
                        x2="12"
                        y2="0"
                        stroke="#FFD700"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{
                          transform: `rotate(${j * 45}deg)`,
                          transformOrigin: "12px 12px",
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </g>
                )}
              </svg>
            </span>
          );
        })}
        <span className="sr-only">
          {editable
            ? `Current rating: ${rating} out of ${max} (use left/right or click)`
            : `${rating} out of ${max} stars`}
        </span>
      </span>
      {/* Your Rating label (animated on update) */}
      {editable && (
        <div
          className="your-rating-label"
          style={{
            marginTop: 6,
            fontWeight: 600,
            color: "#FFD700",
            fontSize: "1.1rem",
            opacity: burstIndex !== null ? 1 : 0.95,
            transition: "opacity .25s cubic-bezier(.4,0,.2,1), transform .35s cubic-bezier(.4,0,.2,1)",
            transform:
              burstIndex !== null
                ? "scale(1.12) translateY(-4px)"
                : "scale(1) translateY(0)",
          }}
        >
          Your Rating: {display}/{max}
        </div>
      )}
      <style jsx>{`
        @keyframes star-burst {
          0% {
            filter: drop-shadow(0 0 0 #ffd700bb);
            opacity: 1;
            transform: scale(1.1);
          }
          40% {
            filter: drop-shadow(0 0 18px #ffd700ff);
            opacity: 1;
            transform: scale(1.6);
          }
          100% {
            filter: drop-shadow(0 0 0 #ffd70000);
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
