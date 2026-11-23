import React from 'react';

export const PixelPumpkin: React.FC<{ alive: boolean; size?: number; className?: string }> = ({
  alive,
  size = 32,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-200 ${alive ? 'scale-100' : 'scale-90 opacity-35 grayscale'}`}
      style={{ shapeRendering: 'crispEdges' }}
      aria-label={alive ? 'Mạng Bí Ngô còn sống' : 'Mạng Bí Ngô đã mất'}
    >
      {/* Stem */}
      <rect x="7" y="1" width="2" height="2" fill={alive ? '#10B981' : '#475569'} />
      <rect x="8" y="0" width="2" height="1" fill={alive ? '#059669' : '#334155'} />
      {/* Pumpkin Body */}
      <rect x="4" y="3" width="8" height="1" fill={alive ? '#FF8A00' : '#475569'} />
      <rect x="2" y="4" width="12" height="2" fill={alive ? '#FF6B00' : '#334155'} />
      <rect x="1" y="6" width="14" height="6" fill={alive ? '#FF6B00' : '#334155'} />
      <rect x="2" y="12" width="12" height="2" fill={alive ? '#E05300' : '#1E293B'} />
      <rect x="4" y="14" width="8" height="1" fill={alive ? '#B84000' : '#0F172A'} />
      {/* Shading ribs */}
      <rect x="5" y="4" width="1" height="10" fill={alive ? '#E05300' : '#1E293B'} />
      <rect x="10" y="4" width="1" height="10" fill={alive ? '#E05300' : '#1E293B'} />
      {/* Eyes */}
      <rect x="3" y="6" width="3" height="2" fill={alive ? '#FEF08A' : '#0F172A'} />
      <rect x="4" y="5" width="1" height="1" fill={alive ? '#FEF08A' : '#0F172A'} />
      <rect x="10" y="6" width="3" height="2" fill={alive ? '#FEF08A' : '#0F172A'} />
      <rect x="11" y="5" width="1" height="1" fill={alive ? '#FEF08A' : '#0F172A'} />
      {/* Nose */}
      <rect x="7" y="8" width="2" height="1" fill={alive ? '#FEF08A' : '#0F172A'} />
      {/* Mouth */}
      <rect x="3" y="10" width="10" height="2" fill={alive ? '#FEF08A' : '#0F172A'} />
      <rect x="5" y="10" width="1" height="1" fill={alive ? '#FF6B00' : '#334155'} />
      <rect x="8" y="11" width="1" height="1" fill={alive ? '#FF6B00' : '#334155'} />
      <rect x="10" y="10" width="1" height="1" fill={alive ? '#FF6B00' : '#334155'} />
    </svg>
  );
};

export const PixelGhost: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ shapeRendering: 'crispEdges' }}
  >
    <rect x="5" y="1" width="6" height="1" fill="#F8FAFC" />
    <rect x="3" y="2" width="10" height="2" fill="#F8FAFC" />
    <rect x="2" y="4" width="12" height="8" fill="#F8FAFC" />
    <rect x="2" y="12" width="2" height="2" fill="#E2E8F0" />
    <rect x="5" y="12" width="2" height="3" fill="#E2E8F0" />
    <rect x="9" y="12" width="2" height="3" fill="#E2E8F0" />
    <rect x="12" y="12" width="2" height="2" fill="#E2E8F0" />
    {/* Glowing Red Eyes */}
    <rect x="4" y="5" width="2" height="3" fill="#F43F5E" />
    <rect x="10" y="5" width="2" height="3" fill="#F43F5E" />
    <rect x="6" y="9" width="4" height="2" fill="#0D0914" />
  </svg>
);

export const PixelCandy: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ shapeRendering: 'crispEdges' }}
  >
    {/* Left wrapper */}
    <rect x="1" y="3" width="2" height="2" fill="#10B981" />
    <rect x="1" y="11" width="2" height="2" fill="#10B981" />
    <rect x="2" y="5" width="2" height="6" fill="#059669" />
    {/* Right wrapper */}
    <rect x="13" y="3" width="2" height="2" fill="#10B981" />
    <rect x="13" y="11" width="2" height="2" fill="#10B981" />
    <rect x="12" y="5" width="2" height="6" fill="#059669" />
    {/* Center Candy */}
    <rect x="4" y="4" width="8" height="8" fill="#34D399" />
    <rect x="5" y="5" width="2" height="6" fill="#FEF08A" />
    <rect x="9" y="5" width="2" height="6" fill="#FEF08A" />
    <rect x="6" y="4" width="4" height="1" fill="#A7F3D0" />
  </svg>
);

export const PixelStickerBadge: React.FC<{ size?: number; className?: string }> = ({ size = 96, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ shapeRendering: 'crispEdges' }}
  >
    {/* Outer White Sticker Die-Cut Border */}
    <rect x="4" y="1" width="16" height="22" fill="#F8FAFC" />
    <rect x="2" y="3" width="20" height="18" fill="#F8FAFC" />
    <rect x="1" y="5" width="22" height="14" fill="#F8FAFC" />
    {/* Inner Purple/Orange Shield */}
    <rect x="5" y="2" width="14" height="20" fill="#1E1333" />
    <rect x="3" y="4" width="18" height="16" fill="#1E1333" />
    <rect x="2" y="6" width="20" height="12" fill="#1E1333" />
    {/* Gold Trim */}
    <rect x="6" y="3" width="12" height="1" fill="#FACC15" />
    <rect x="6" y="20" width="12" height="1" fill="#FACC15" />
    <rect x="4" y="6" width="1" height="12" fill="#FACC15" />
    <rect x="19" y="6" width="1" height="12" fill="#FACC15" />
    {/* Center Pumpkin Star */}
    <rect x="11" y="5" width="2" height="2" fill="#10B981" />
    <rect x="8" y="7" width="8" height="8" fill="#FF6B00" />
    <rect x="7" y="8" width="10" height="6" fill="#FF6B00" />
    {/* Eyes & Smile */}
    <rect x="9" y="9" width="2" height="2" fill="#FEF08A" />
    <rect x="13" y="9" width="2" height="2" fill="#FEF08A" />
    <rect x="9" y="12" width="6" height="2" fill="#FEF08A" />
    {/* Ribbon at bottom */}
    <rect x="7" y="16" width="10" height="3" fill="#10B981" />
    <rect x="8" y="17" width="8" height="1" fill="#064E3B" />
  </svg>
);
