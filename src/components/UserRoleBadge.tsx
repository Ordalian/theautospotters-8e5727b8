interface UserRoleBadgeProps {
  role?: string | null;
  isPremium?: boolean | null;
  isMapMarker?: boolean | null;
  size?: "sm" | "md";
  className?: string;
}

const sizeMap = { sm: 14, md: 18 };

function FounderBadge({ s }: { s: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block shrink-0"
      aria-label="Founder"
    >
      {/* Shield */}
      <path
        d="M12 2L3 7v5c0 5.25 3.81 10.15 9 11.25C17.19 22.15 21 17.25 21 12V7l-9-5z"
        fill="url(#founder-gold)"
        stroke="#b8860b"
        strokeWidth="1"
      />
      {/* Star */}
      <path
        d="M12 7l1.5 3.1 3.4.5-2.45 2.4.58 3.4L12 14.6l-3.03 1.8.58-3.4L7.1 10.6l3.4-.5L12 7z"
        fill="#fff"
        fillOpacity="0.9"
      />
      {/* Sparkle top-right */}
      <circle cx="18.5" cy="4.5" r="1.2" fill="#FFD700" opacity="0.9" />
      <circle cx="18.5" cy="4.5" r="0.5" fill="#fff" />
      {/* Sparkle left */}
      <circle cx="4.5" cy="5.5" r="0.9" fill="#FFD700" opacity="0.8" />
      <circle cx="4.5" cy="5.5" r="0.35" fill="#fff" />
      <defs>
        <linearGradient id="founder-gold" x1="3" y1="2" x2="21" y2="23">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#DAA520" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AdminBadge({ s }: { s: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block shrink-0"
      aria-label="Admin"
    >
      {/* Shield */}
      <path
        d="M12 2L3 7v5c0 5.25 3.81 10.15 9 11.25C17.19 22.15 21 17.25 21 12V7l-9-5z"
        fill="url(#admin-red)"
        stroke="#991b1b"
        strokeWidth="1"
      />
      {/* Wrench / tool */}
      <path
        d="M14.7 9.3a3 3 0 00-3.8.4l-.2.2a3 3 0 00.4 3.8l3.3 3.3a1 1 0 001.4 0l1.4-1.4a1 1 0 000-1.4l-2.5-4.9z"
        fill="#fff"
        fillOpacity="0.85"
      />
      <path
        d="M10 8.5L8 10.5l1.5 1.5 2-2-1.5-1.5z"
        fill="#fff"
        fillOpacity="0.85"
      />
      <defs>
        <linearGradient id="admin-red" x1="3" y1="2" x2="21" y2="23">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function PremiumBadge({ s }: { s: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="inline-block shrink-0"
      aria-label="Premium"
    >
      {/* Diamond */}
      <path
        d="M12 2L2 9l10 13L22 9 12 2z"
        fill="url(#premium-blue)"
        stroke="#1e40af"
        strokeWidth="1"
      />
      {/* Facet lines */}
      <path d="M7 9h10L12 20 7 9z" fill="#fff" fillOpacity="0.2" />
      <path d="M7 9l5-5.5L17 9" fill="#fff" fillOpacity="0.15" />
      <defs>
        <linearGradient id="premium-blue" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MapMarkerBadge({ s }: { s: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="inline-block shrink-0" aria-label="Map marker">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
      <circle cx="12" cy="9" r="2.5" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}

const UserRoleBadge = ({ role, isPremium, isMapMarker, size = "sm", className = "" }: UserRoleBadgeProps) => {
  const s = sizeMap[size];
  const showFounder = role === "founder";
  const showAdmin = role === "admin";
  const showMapMarker = !!isMapMarker;
  const showPremium = !!isPremium;

  if (!showFounder && !showAdmin && !showMapMarker && !showPremium) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className}`}>
      {showFounder && <FounderBadge s={s} />}
      {showAdmin && <AdminBadge s={s} />}
      {showMapMarker && <MapMarkerBadge s={s} />}
      {showPremium && <PremiumBadge s={s} />}
    </span>
  );
};

export default UserRoleBadge;
