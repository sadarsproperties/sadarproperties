import React from 'react';

interface LogoProps {
  size?: number;
  dark?: boolean;
  showText?: boolean;
}

export default function Logo({ size = 36, dark = false, showText = true }: LogoProps) {
  const textColor = dark ? 'text-white' : 'text-[#1A3C34]';

  return (
    <div className="flex items-center gap-2">
      <img 
        src="/sadar_properties_app_icon.png" 
        alt="Sadar Properties" 
        style={{ height: size, width: 'auto' }}
        className="object-contain"
        onError={(e) => {
          // Fallback if image has not been copied to the public folder yet
          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231A3C34'%3E%3Cpath d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E";
        }}
      />
      {showText && (
        <span className={`font-bold tracking-tight ${textColor}`} style={{ fontSize: size * 0.5 }}>
          Sadar Properties
        </span>
      )}
    </div>
  );
}
