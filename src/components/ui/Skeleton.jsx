// 🛡️ ARCHITECTURAL STANDARDIZATION: Reusable Skeleton Primitive
export function Skeleton({ className }) {
  return (
    <div 
      className={`animate-pulse bg-surface-lighter rounded-md ${className}`} 
      style={{ 
        // 🎨 Subtle shimmer effect using our semantic surface tokens
        backgroundColor: 'var(--color-surface-soft, #2a2a2a)' 
      }}
    />
  );
}