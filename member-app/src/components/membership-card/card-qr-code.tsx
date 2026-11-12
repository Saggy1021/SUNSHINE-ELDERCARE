'use client';

import React from 'react';

interface CardQrCodeProps {
  memberId: string;
  size?: number;
}

export function CardQrCode({ memberId, size = 120 }: CardQrCodeProps) {
  // Deterministic pattern generator based on memberId hash
  const hash = Array.from(memberId).reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return (
    <div
      className="bg-white p-2 rounded-xl shadow-xs flex flex-col items-center justify-center border border-amber-200/50"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 25 25"
        width={size - 16}
        height={size - 16}
        shapeRendering="crispEdges"
      >
        <rect width="25" height="25" fill="#FFFFFF" />

        {/* Position markers (Top-Left, Top-Right, Bottom-Left) */}
        {/* TL */}
        <rect x="1" y="1" width="7" height="7" fill="#091329" />
        <rect x="2" y="2" width="5" height="5" fill="#FFFFFF" />
        <rect x="3" y="3" width="3" height="3" fill="#B08A4A" />

        {/* TR */}
        <rect x="17" y="1" width="7" height="7" fill="#091329" />
        <rect x="18" y="2" width="5" height="5" fill="#FFFFFF" />
        <rect x="19" y="3" width="3" height="3" fill="#B08A4A" />

        {/* BL */}
        <rect x="1" y="17" width="7" height="7" fill="#091329" />
        <rect x="2" y="18" width="5" height="5" fill="#FFFFFF" />
        <rect x="3" y="19" width="3" height="3" fill="#B08A4A" />

        {/* Data pattern modules */}
        {[
          [10, 2], [12, 2], [14, 2],
          [9, 4], [11, 4], [13, 4], [15, 4],
          [2, 10], [4, 10], [6, 10], [10, 10], [12, 10], [14, 10], [18, 10], [20, 10], [22, 10],
          [3, 12], [5, 12], [9, 12], [11, 12], [15, 12], [17, 12], [21, 12],
          [10, 14], [12, 14], [14, 14], [18, 14],
          [10, 17], [12, 17], [14, 17], [16, 17], [20, 17], [22, 17],
          [9, 19], [11, 19], [13, 19], [17, 19], [21, 19],
          [10, 21], [14, 21], [18, 21], [22, 21],
        ].map(([x, y], idx) => (
          <rect
            key={idx}
            x={x}
            y={y}
            width="1"
            height="1"
            fill={(idx + hash) % 3 === 0 ? '#B08A4A' : '#091329'}
          />
        ))}
      </svg>
    </div>
  );
}

