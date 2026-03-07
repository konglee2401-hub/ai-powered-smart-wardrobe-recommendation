import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return <div className={`ui-skeleton rounded-2xl ${className}`} />;
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="space-y-3 p-4 lg:p-5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <SkeletonBlock key={colIndex} className="h-10" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(7,14,28,0.98))] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.32)]">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="mt-4 h-8 w-20" />
          <SkeletonBlock className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
