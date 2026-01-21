import { vars } from "nativewind";

// NativeWind runs on React Native (no DOM), so CSS variables must be applied
// via `vars()` on a parent View style, not via `:root` selectors.

export const lightThemeVars = vars({
  "--background": "250 250 249",
  "--foreground": "42 62 80",
  "--card": "255 255 255",
  "--card-foreground": "42 62 80",
  "--popover": "255 255 255",
  "--popover-foreground": "42 62 80",
  "--primary": "28 140 233",
  "--primary-foreground": "255 255 255",
  "--secondary": "235 246 255",
  "--secondary-foreground": "66 74 82",
  "--muted": "244 248 251",
  "--muted-foreground": "79 92 109",
  "--accent": "235 246 255",
  "--accent-foreground": "28 140 233",
  "--destructive": "220 40 40",
  "--destructive-foreground": "255 255 255",
  "--border": "224 235 245",
  "--input": "255 255 255",
  "--ring": "28 140 233",
  "--chart-1": "28 140 233",
  "--chart-2": "150 201 237",
  "--chart-3": "40 200 160",
  "--chart-4": "144 161 162",
  "--chart-5": "242 234 222",
  "--sidebar": "246 244 245",
  "--sidebar-foreground": "80 73 79",
  "--sidebar-primary": "28 140 233",
  "--sidebar-primary-foreground": "255 255 255",
  "--sidebar-accent": "242 237 241",
  "--sidebar-accent-foreground": "28 140 233",
  "--sidebar-border": "238 227 236",
  "--sidebar-ring": "28 140 233",
  "--radius": "0.75rem",
  "--shadow-2xs": "0px 2px 10px 0px rgb(0 0 0 / 0.03)",
  "--shadow-xs": "0px 2px 10px 0px rgb(0 0 0 / 0.03)",
  "--shadow-sm":
    "0px 2px 10px 0px rgb(0 0 0 / 0.05), 0px 1px 2px -1px rgb(0 0 0 / 0.05)",
  "--shadow":
    "0px 2px 10px 0px rgb(0 0 0 / 0.05), 0px 1px 2px -1px rgb(0 0 0 / 0.05)",
  "--shadow-md":
    "0px 2px 10px 0px rgb(0 0 0 / 0.05), 0px 2px 4px -1px rgb(0 0 0 / 0.05)",
  "--shadow-lg":
    "0px 2px 10px 0px rgb(0 0 0 / 0.05), 0px 4px 6px -1px rgb(0 0 0 / 0.05)",
  "--shadow-xl":
    "0px 2px 10px 0px rgb(0 0 0 / 0.05), 0px 8px 10px -1px rgb(0 0 0 / 0.05)",
  "--shadow-2xl": "0px 2px 10px 0px rgb(0 0 0 / 0.13)",
  "--tracking-normal": "0rem",
});

export const darkThemeVars = vars({
  "--background": "51 41 49",
  "--foreground": "248 247 248",
  "--card": "51 41 49",
  "--card-foreground": "248 247 248",
  "--popover": "51 41 49",
  "--popover-foreground": "248 247 248",
  "--primary": "71 172 255",
  "--primary-foreground": "51 41 49",
  "--secondary": "73 55 69",
  "--secondary-foreground": "196 171 193",
  "--muted": "73 55 69",
  "--muted-foreground": "176 141 170",
  "--accent": "73 55 69",
  "--accent-foreground": "71 172 255",
  "--destructive": "161 38 38",
  "--destructive-foreground": "255 255 255",
  "--border": "87 61 82",
  "--input": "73 55 69",
  "--ring": "71 172 255",
  "--chart-1": "71 172 255",
  "--chart-2": "28 140 233",
  "--chart-3": "40 200 160",
  "--chart-4": "144 161 162",
  "--chart-5": "242 234 222",
  "--sidebar": "59 48 57",
  "--sidebar-foreground": "196 171 193",
  "--sidebar-primary": "71 172 255",
  "--sidebar-primary-foreground": "51 41 49",
  "--sidebar-accent": "73 55 69",
  "--sidebar-accent-foreground": "71 172 255",
  "--sidebar-border": "87 61 83",
  "--sidebar-ring": "71 172 255",
  "--shadow-2xs": "0px 2px 10px 0px rgb(0 0 0 / 0.1)",
  "--shadow-xs": "0px 2px 10px 0px rgb(0 0 0 / 0.1)",
  "--shadow-sm":
    "0px 2px 10px 0px rgb(0 0 0 / 0.2), 0px 1px 2px -1px rgb(0 0 0 / 0.2)",
  "--shadow":
    "0px 2px 10px 0px rgb(0 0 0 / 0.2), 0px 1px 2px -1px rgb(0 0 0 / 0.2)",
  "--shadow-md":
    "0px 2px 10px 0px rgb(0 0 0 / 0.2), 0px 2px 4px -1px rgb(0 0 0 / 0.2)",
  "--shadow-lg":
    "0px 2px 10px 0px rgb(0 0 0 / 0.2), 0px 4px 6px -1px rgb(0 0 0 / 0.2)",
  "--shadow-xl":
    "0px 2px 10px 0px rgb(0 0 0 / 0.2), 0px 8px 10px -1px rgb(0 0 0 / 0.2)",
  "--shadow-2xl": "0px 2px 10px 0px rgb(0 0 0 / 0.5)",
  "--tracking-normal": "0rem",
});

