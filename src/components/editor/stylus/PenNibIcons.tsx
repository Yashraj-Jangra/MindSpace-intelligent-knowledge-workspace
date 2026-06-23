'use client';

import React from 'react';

export function FountainNibIcon({ className = 'w-6 h-10', isSelected = false }: { className?: string; isSelected?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stainless steel nib body */}
      <path d="M12 2L4 18V36H20V18L12 2Z" fill={isSelected ? '#FAFAFA' : '#737373'} />
      {/* Breather hole & slit */}
      <circle cx="12" cy="18" r="2" fill="#0F0F0F" />
      <line x1="12" y1="2" x2="12" y2="16" stroke="#0F0F0F" strokeWidth="1.5" />
      {/* Base collar */}
      <rect x="5" y="32" width="14" height="6" fill="#262626" />
    </svg>
  );
}

export function CalligraphyNibIcon({ className = 'w-6 h-10', isSelected = false }: { className?: string; isSelected?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stainless steel nib body with red accent */}
      <path d="M12 2L4 18V36H20V18L12 2Z" fill={isSelected ? '#FAFAFA' : '#737373'} />
      {/* Red calligraphy accent slit */}
      <line x1="12" y1="2" x2="12" y2="24" stroke="#FF3D00" strokeWidth="2" />
      {/* Base collar */}
      <rect x="5" y="32" width="14" height="6" fill="#262626" />
    </svg>
  );
}

export function FinelinerNibIcon({ className = 'w-6 h-10', isSelected = false }: { className?: string; isSelected?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fine metal tip */}
      <path d="M12 2L9 12H15L12 2Z" fill={isSelected ? '#FAFAFA' : '#A3A3A3'} />
      {/* Tapered black barrel */}
      <path d="M9 12L6 36H18L15 12H9Z" fill="#1A1A1A" stroke="#262626" strokeWidth="1" />
    </svg>
  );
}

export function BallpointNibIcon({ className = 'w-6 h-10', isSelected = false }: { className?: string; isSelected?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tip cone */}
      <path d="M12 2L7 16H17L12 2Z" fill={isSelected ? '#FAFAFA' : '#D4D4D4'} />
      {/* White grip band */}
      <rect x="7" y="16" width="10" height="12" fill="#E5E5E5" />
      {/* Dark body */}
      <rect x="7" y="28" width="10" height="10" fill="#262626" />
    </svg>
  );
}

export function PencilNibIcon({ className = 'w-6 h-10', isSelected = false }: { className?: string; isSelected?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Graphite lead tip */}
      <path d="M12 2L9 10H15L12 2Z" fill="#404040" />
      {/* Sharpened wood cone */}
      <path d="M9 10L6 20H18L15 10H9Z" fill="#D4A373" />
      {/* Wooden pencil body */}
      <rect x="6" y="20" width="12" height="18" fill={isSelected ? '#4285F4' : '#525252'} />
    </svg>
  );
}
