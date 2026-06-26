/** Dedicated admin panel URL — not linked from the public storefront. */
export function getAdminPath(): string {
  const configured = import.meta.env.VITE_ADMIN_PATH || '/admin';
  const normalized = configured.startsWith('/') ? configured : `/${configured}`;
  return normalized.replace(/\/+$/, '') || '/admin';
}

export function isAdminRoute(pathname: string = window.location.pathname): boolean {
  const adminPath = getAdminPath();
  return pathname === adminPath || pathname.startsWith(`${adminPath}/`);
}

export function exitAdminRoute(): void {
  window.history.replaceState({}, '', '/');
}

export function goToAdminRoute(): void {
  window.history.pushState({}, '', getAdminPath());
}
