export const DTECHNURSE_LOGO_FALLBACK = '/dtechnurse-logo.jpg';
export function getDisplayImage(url: string | null | undefined): string {
  return typeof url === 'string' && url.trim() ? url : DTECHNURSE_LOGO_FALLBACK;
}
