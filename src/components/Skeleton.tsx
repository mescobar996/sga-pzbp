import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
  gap?: string;
}

export function Skeleton({ variant = 'text', width, height, className = '', count = 1, gap = 'gap-2' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const variantClasses = {
    text: 'h-4',
    rectangular: 'h-20',
    circular: 'rounded-full aspect-square',
    card: 'border-2 border-gray-300 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] p-4',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const items = Array.from({ length: count });

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} style={style}>
        <div className="flex justify-between items-start mb-3">
          <div className="h-5 bg-gray-300 rounded w-24 animate-pulse" />
          <div className="h-5 w-5 bg-gray-300 rounded animate-pulse" />
        </div>
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-3 animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-3 bg-gray-300 rounded w-full animate-pulse" />
          <div className="h-3 bg-gray-300 rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${gap} ${className}`}>
      {items.map((_, i) => (
        <div key={i} className={`${baseClasses} ${variantClasses[variant]} animate-pulse`} style={style} />
      ))}
    </div>
  );
}

interface SkeletonPageProps {
  title?: string;
  cardCount?: number;
  layout?: 'cards' | 'table' | 'list';
}

export function SkeletonPage({ title = 'Cargando', cardCount = 3, layout = 'cards' }: SkeletonPageProps) {
  if (layout === 'table') {
    return (
      <div className="font-['Inter'] max-w-6xl mx-auto">
        <div className="h-10 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
        <div className="bg-white border-2 border-gray-300 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] p-5">
          <div className="flex flex-col gap-4">
            {Array.from({ length: cardCount }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-5 bg-gray-200 rounded flex-1 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="font-['Inter'] max-w-6xl mx-auto mt-4 px-4 sm:px-8">
        <div className="flex gap-4 mb-4">
            <div className="h-10 border-2 border-[#1a1a1a] bg-[#f5f0e8] w-full animate-pulse" />
            <div className="h-10 border-2 border-[#1a1a1a] bg-white w-48 animate-pulse hidden sm:block" />
        </div>
        <div className="flex flex-col gap-3 sm:gap-4">
          {Array.from({ length: cardCount }).map((_, i) => (
            <div key={i} className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-3 sm:p-4 flex items-center justify-between gap-3 min-h-[80px]">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-5 w-5 border-2 border-[#1a1a1a] bg-[#f5f0e8] animate-pulse shrink-0" />
                <div className="h-10 w-10 border-2 border-[#1a1a1a] bg-[#f5f0e8] animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-5 bg-gray-200 w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-200 w-1/3 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-24 border-2 border-[#1a1a1a] bg-[#f5f0e8] animate-pulse hidden sm:block" />
                <div className="h-10 w-10 border-2 border-[#1a1a1a] bg-[#f5f0e8] animate-pulse" />
                <div className="h-10 w-10 border-2 border-[#1a1a1a] bg-[#f5f0e8] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <div className="h-10 bg-gray-200 rounded w-64 mb-6 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    </div>
  );
}
