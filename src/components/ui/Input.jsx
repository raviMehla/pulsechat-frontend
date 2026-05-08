export function Input({ 
  label, 
  name,          // 🛡️ FIX: Added name to props
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  disabled = false,
  required = false,
  maxLength
}) {
  return (
    <div className="space-y-1 w-full">
      {label && <label className="text-sm font-medium text-textMuted">{label}</label>}
      <input 
        name={name}      // 🛡️ FIX: Passed name down to the native DOM element
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        className="w-full p-2.5 bg-surface border border-borderSubtle rounded-lg text-textPrimary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-textMuted/50"
      />
    </div>
  );
}