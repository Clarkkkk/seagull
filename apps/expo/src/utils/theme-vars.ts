import { vars } from "nativewind";

import { designTokens, hexToRgbVar, hexToRgbaCss } from "./design-tokens";

// NativeWind runs on React Native (no DOM), so CSS variables must be applied
// via `vars()` on a parent View style, not via `:root` selectors.

function makeThemeVars(theme: "light" | "dark") {
  const t = designTokens[theme];
  const shadowSubtle = hexToRgbaCss(t.shadowSubtle);

  return vars({
    // Design-tokens namespace (for fine-grained UI matching)
    "--bg-primary": hexToRgbVar(t.bgPrimary),
    "--bg-surface": hexToRgbVar(t.bgSurface),
    "--bg-muted": hexToRgbVar(t.bgMuted),
    "--bg-elevated": hexToRgbVar(t.bgElevated),

    "--text-primary": hexToRgbVar(t.textPrimary),
    "--text-secondary": hexToRgbVar(t.textSecondary),
    "--text-tertiary": hexToRgbVar(t.textTertiary),

    "--border-subtle": hexToRgbVar(t.borderSubtle),
    "--border-strong": hexToRgbVar(t.borderStrong),

    "--accent-primary": hexToRgbVar(t.accentPrimary),
    "--accent-light": hexToRgbVar(t.accentLight),
    "--accent-sky": hexToRgbVar(t.accentSky),
    "--accent-mint": hexToRgbVar(t.accentMint),
    "--accent-coral": hexToRgbVar(t.accentCoral),
    "--accent-warm": hexToRgbVar(t.accentWarm),

    // Base semantic tokens (existing Tailwind classnames rely on these)
    "--background": hexToRgbVar(t.bgPrimary),
    "--foreground": hexToRgbVar(t.textPrimary),
    "--card": hexToRgbVar(t.bgSurface),
    "--card-foreground": hexToRgbVar(t.textPrimary),
    "--popover": hexToRgbVar(t.bgSurface),
    "--popover-foreground": hexToRgbVar(t.textPrimary),
    "--primary": hexToRgbVar(t.accentPrimary),
    "--primary-foreground": "255 255 255",
    "--secondary": hexToRgbVar(t.accentLight),
    "--secondary-foreground": hexToRgbVar(t.textPrimary),
    "--muted": hexToRgbVar(t.bgMuted),
    "--muted-foreground": hexToRgbVar(t.textSecondary),
    "--accent": hexToRgbVar(t.bgElevated),
    "--accent-foreground": hexToRgbVar(t.accentPrimary),
    "--destructive": "220 40 40",
    "--destructive-foreground": "255 255 255",
    "--border": hexToRgbVar(t.borderSubtle),
    "--input": hexToRgbVar(t.bgSurface),
    "--ring": hexToRgbVar(t.accentPrimary),

    // Used by OceanBackdrop and charts
    "--chart-1": hexToRgbVar(t.accentPrimary),
    "--chart-2": hexToRgbVar(t.accentSky),
    "--chart-3": hexToRgbVar(t.accentMint),
    "--chart-4": hexToRgbVar(t.accentCoral),
    "--chart-5": hexToRgbVar(t.accentWarm),

    // Sidebar tokens (not heavily used in Expo, but keep consistent)
    "--sidebar": hexToRgbVar(t.bgSurface),
    "--sidebar-foreground": hexToRgbVar(t.textSecondary),
    "--sidebar-primary": hexToRgbVar(t.accentPrimary),
    "--sidebar-primary-foreground": "255 255 255",
    "--sidebar-accent": hexToRgbVar(t.accentLight),
    "--sidebar-accent-foreground": hexToRgbVar(t.accentPrimary),
    "--sidebar-border": hexToRgbVar(t.borderSubtle),
    "--sidebar-ring": hexToRgbVar(t.accentPrimary),

    // Keep radius scale (we'll use Tailwind's built-ins in UI)
    "--radius": "0.75rem",

    // Shadows (match the design's subtle “aqua” shadow color)
    "--shadow-2xs": `0px 2px 12px 0px ${shadowSubtle}`,
    "--shadow-xs": `0px 2px 12px 0px ${shadowSubtle}`,
    "--shadow-sm": `0px 2px 12px 0px ${shadowSubtle}, 0px 1px 2px -1px ${shadowSubtle}`,
    "--shadow": `0px 2px 14px 0px ${shadowSubtle}, 0px 1px 2px -1px ${shadowSubtle}`,
    "--shadow-md": `0px 6px 18px 0px ${shadowSubtle}, 0px 2px 6px -2px ${shadowSubtle}`,
    "--shadow-lg": `0px 10px 24px 0px ${shadowSubtle}, 0px 4px 10px -4px ${shadowSubtle}`,
    "--shadow-xl": `0px 16px 30px 0px ${shadowSubtle}, 0px 6px 16px -6px ${shadowSubtle}`,
    "--shadow-2xl": `0px 22px 40px 0px ${shadowSubtle}`,

    "--tracking-normal": "0rem",
  });
}

export const lightThemeVars = makeThemeVars("light");
export const darkThemeVars = makeThemeVars("dark");

