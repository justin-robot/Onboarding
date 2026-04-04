/**
 * Avatar utility functions for consistent initials and color coding
 */

/**
 * Get single-letter initial from a name
 */
export function getInitial(name: string | undefined | null): string {
  if (!name || name.trim().length === 0) return "?";
  return name.trim().charAt(0).toUpperCase();
}

/**
 * 17 distinct colors - Tailwind 500-level with good white text contrast
 */
export const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
] as const;

/**
 * djb2 hash algorithm - consistent color from any string
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Get avatar color from identifier (userId/email preferred, fallback to name)
 * Uses FULL string for hash, so Emily and Eric get different colors
 */
export function getAvatarColor(
  identifier?: string | null,
  fallbackName?: string | null
): string {
  const str = identifier || fallbackName || "unknown";
  const hash = hashString(str.toLowerCase().trim());
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/**
 * Combined utility for both initial and color
 */
export function getAvatarProps(
  name: string | undefined | null,
  identifier?: string | undefined | null
): { initial: string; colorClass: string } {
  return {
    initial: getInitial(name),
    colorClass: getAvatarColor(identifier, name),
  };
}
