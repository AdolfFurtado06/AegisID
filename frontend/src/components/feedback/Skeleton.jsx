import React from "react";

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full animate-pulse space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-gray-200/80 rounded"
              style={{
                width: cIdx === 0 ? "25%" : cIdx === 1 ? "15%" : "12%",
                opacity: 0.8 - rIdx * 0.1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-borderSoft rounded-card p-6 shadow-xs animate-pulse space-y-4">
      <div className="h-5 bg-gray-200/80 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
      </div>
      <div className="h-8 bg-gray-200/60 rounded w-1/4 mt-4" />
    </div>
  );
}
