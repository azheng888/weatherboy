export default function Logo({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="currentColor" />
      <circle cx="16" cy="13.5" r="5" fill="#f2643a" />
      <path d="M5 21.5c3.2-2.6 6.8-3.9 11-3.9s7.8 1.3 11 3.9" stroke="#57c76a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 25.5c2.4-1.6 5-2.4 8-2.4s5.6.8 8 2.4" stroke="#ddf3d9" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
