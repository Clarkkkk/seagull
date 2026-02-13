type ThemeName = "light" | "dark";

function clampByte(n: number) {
  return Math.max(0, Math.min(255, n));
}

function parseHexByte(pair: string) {
  const n = Number.parseInt(pair, 16);
  return clampByte(Number.isFinite(n) ? n : 0);
}

/**
 * Supports:
 * - #RRGGBB
 * - #RRGGBBAA (alpha ignored for rgb var output)
 */
export function hexToRgbVar(hex: string): string {
  const h = hex.trim().replace(/^#/, "");
  if (h.length !== 6 && h.length !== 8) return "0 0 0";
  const r = parseHexByte(h.slice(0, 2));
  const g = parseHexByte(h.slice(2, 4));
  const b = parseHexByte(h.slice(4, 6));
  return `${r} ${g} ${b}`;
}

/**
 * Convert #RRGGBBAA to a CSS rgba() string.
 * If alpha is missing, defaults to 1.
 */
export function hexToRgbaCss(hex: string): string {
  const h = hex.trim().replace(/^#/, "");
  if (h.length !== 6 && h.length !== 8) return "rgba(0,0,0,1)";
  const r = parseHexByte(h.slice(0, 2));
  const g = parseHexByte(h.slice(2, 4));
  const b = parseHexByte(h.slice(4, 6));
  const a = h.length === 8 ? parseHexByte(h.slice(6, 8)) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Source of truth for the new Wish UI palette.
 * Light values are taken from `seagull-ui.pen` (blue ocean mode).
 * Dark values are derived to keep the same “ocean” brand feel.
 */
export const designTokens: Record<
  ThemeName,
  {
    bgPrimary: string;
    bgSurface: string;
    bgMuted: string;
    bgElevated: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    borderSubtle: string;
    borderStrong: string;
    accentPrimary: string;
    accentLight: string;
    accentSky: string;
    accentMint: string;
    accentCoral: string;
    accentWarm: string;
    shadowSubtle: string;
  }
> = {
  light: {
    bgPrimary: "#F5F9FD",
    bgSurface: "#FFFFFF",
    bgMuted: "#E0EEF8",
    bgElevated: "#EBF4FB",
    textPrimary: "#1A3A4A",
    textSecondary: "#5B7B8A",
    textTertiary: "#8BABBA",
    borderSubtle: "#C8DEF0",
    borderStrong: "#A8D8E8",
    accentPrimary: "#4A9FD4",
    accentLight: "#D4EBF7",
    accentSky: "#5AADE0",
    accentMint: "#6BB8E8",
    accentCoral: "#EFA08A",
    accentWarm: "#F5C9A8",
    shadowSubtle: "#1A3A4A08",
  },
  dark: {
    bgPrimary: "#061823",
    bgSurface: "#0A2230",
    bgMuted: "#0C2A3A",
    bgElevated: "#0E3246",
    textPrimary: "#E8F6FD",
    textSecondary: "#AECFE0",
    textTertiary: "#7FA5B8",
    borderSubtle: "#16384A",
    borderStrong: "#24566F",
    accentPrimary: "#4A9FD4",
    accentLight: "#12364B",
    accentSky: "#5AADE0",
    accentMint: "#6BB8E8",
    accentCoral: "#EFA08A",
    accentWarm: "#F5C9A8",
    shadowSubtle: "#00000066",
  },
};

