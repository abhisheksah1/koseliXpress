import React from 'react';

export function EsewaIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#60BB46" />
      <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="Arial">eSewa</text>
    </svg>
  );
}

export function KhaltiIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#5C2D91" />
      <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="Arial">Khalti</text>
    </svg>
  );
}

export function FonepayIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#E31937" />
      <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="Arial">Fonepay</text>
    </svg>
  );
}

export function CardIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#1E3A8A" />
      <rect x="10" y="16" width="28" height="18" rx="3" fill="#fff" opacity="0.95" />
      <rect x="10" y="22" width="28" height="4" fill="#CBD5E1" />
    </svg>
  );
}

export function CodIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#059669" />
      <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Arial">COD</text>
    </svg>
  );
}

export function GatewayLogo({
  gatewayId,
  logoUrl,
  className = 'w-8 h-8',
}: {
  gatewayId: string;
  logoUrl?: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const id = gatewayId.toLowerCase();

  if (!failed && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={`${className} object-contain rounded-md`}
        onError={() => setFailed(true)}
      />
    );
  }

  if (id.includes('esewa')) return <EsewaIcon className={className} />;
  if (id.includes('khalti')) return <KhaltiIcon className={className} />;
  if (id.includes('fonepay')) return <FonepayIcon className={className} />;
  if (id === 'cod') return <CodIcon className={className} />;
  return <CardIcon className={className} />;
}
