export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  type = 'button', 
  disabled = false, 
  className = '' 
}) {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center";
  
  const variants = {
    primary: "bg-accent hover:bg-accentHover text-white shadow-sm",
    danger: "bg-danger hover:bg-red-600 text-white shadow-sm",
    ghost: "bg-transparent text-textMuted hover:text-textPrimary hover:bg-surface",
    outline: "bg-transparent border border-borderSubtle text-textPrimary hover:bg-surface",
    outlineDanger: "bg-danger/10 border border-danger/30 text-danger hover:bg-danger hover:text-white"
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}