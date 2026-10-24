import Spinner from './Spinner';

const variants = {
  primary:
    'bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white hover:bg-surface-container-low text-primary border border-outline px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
  outline:
    'bg-white hover:bg-surface-container-low text-primary border border-outline-variant/80 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:border-outline disabled:opacity-50 disabled:cursor-not-allowed shadow-xs',
  danger:
    'bg-error hover:bg-error/90 text-on-error px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-error/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
};

export default function Button({
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`${variants[variant] || variants.primary} ${className}`}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        {loading ? <Spinner size="sm" className="border-white" /> : null}
        {children}
      </span>
    </button>
  );
}
