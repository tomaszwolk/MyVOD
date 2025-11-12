import type { ReactNode } from "react";
import netflixIcon from "@/assets/icons/netflix-1-logo.svg";
import hbomaxIcon from "@/assets/icons/hbo-max-logo.svg";
import disneyplusIcon from "@/assets/icons/disneyplus_logo.svg";
import primevideoIcon from "@/assets/icons/amazon_prime_logo_blue.svg";
import appletvplusIcon from "@/assets/icons/apple-tv-logo.svg";

/**
 * Platform icons mapping for VOD platforms.
 * Maps platform slug to SVG icon component.
 */

export const platformIcons: Record<string, (props: { className?: string }) => ReactNode> = {
  netflix: ({ className }) => (
    <img src={netflixIcon} alt="Netflix" className={className} />
  ),
  hbomax: ({ className }) => (
    <img src={hbomaxIcon} alt="HBO Max" className={className} />
  ),
  disneyplus: ({ className }) => (
    <img src={disneyplusIcon} alt="Disney+" className={className} />
  ),
  primevideo: ({ className }) => (
    <img src={primevideoIcon} alt="Amazon Prime Video" className={className} />
  ),
  appletvplus: ({ className }) => (
    <img src={appletvplusIcon} alt="Apple TV+" className={className} />
  ),
  // Placeholder for platforms without specific icons
  default: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12zM9 10v8l7-4z"/>
    </svg>
  ),
};

/**
 * Get platform icon component by slug
 * @param slug - Platform slug
 * @returns Icon component or null if not found
 */
export function getPlatformIcon(slug: string): ((props: { className?: string }) => ReactNode) | null {
  return platformIcons[slug.toLowerCase()] || null;
}

/**
 * Get platform icon as data URL for img src
 * @param slug - Platform slug
 * @returns Data URL string or null if not found
 */
export function getPlatformIconSrc(slug: string): string | null {
  const Icon = getPlatformIcon(slug);
  if (!Icon) return null;

  // For now, return a placeholder. In a real implementation,
  // you would render the SVG to a canvas and get the data URL
  return null;
}
