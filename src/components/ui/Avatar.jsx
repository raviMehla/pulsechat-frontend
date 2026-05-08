import { useState } from "react";

export function Avatar({ 
  src, 
  alt = "User", 
  size = "md", 
  isOnline, 
  className = "" 
}) {
  const [imgError, setImgError] = useState(false);

  // 📐 Design System: Standardized Sizing Tokens
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
    xxl: "w-24 h-24 text-2xl"
  };

  const badgeSizeMap = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
    xxl: "w-5 h-5"
  };

  // 🛡️ Fallback Logic: Extract initials if image fails
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      
      {/* Avatar Container */}
      <div 
        className={`rounded-full overflow-hidden bg-surface border border-borderSubtle flex items-center justify-center text-accent font-semibold shadow-sm ${sizeMap[size]}`}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)} // 🛡️ Triggers fallback on 404
            loading="lazy"
          />
        ) : (
          <span>{getInitials(alt)}</span>
        )}
      </div>

      {/* Online/Offline Status Indicator */}
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-background ${
            isOnline ? "bg-online" : "bg-textMuted"
          } ${badgeSizeMap[size]}`}
        />
      )}
    </div>
  );
}