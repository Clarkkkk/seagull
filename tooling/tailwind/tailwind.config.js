/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background) / <alpha-value>)",
                foreground: "rgb(var(--foreground) / <alpha-value>)",
                card: {
                    DEFAULT: "rgb(var(--card) / <alpha-value>)",
                    foreground: "rgb(var(--card-foreground) / <alpha-value>)",
                },
                popover: {
                    DEFAULT: "rgb(var(--popover) / <alpha-value>)",
                    foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
                },
                primary: {
                    DEFAULT: "rgb(var(--primary) / <alpha-value>)",
                    foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
                },
                secondary: {
                    DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
                    foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
                },
                muted: {
                    DEFAULT: "rgb(var(--muted) / <alpha-value>)",
                    foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
                },
                accent: {
                    DEFAULT: "rgb(var(--accent) / <alpha-value>)",
                    foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
                },
                destructive: {
                    DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
                    foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
                },
                border: "rgb(var(--border) / <alpha-value>)",
                input: "rgb(var(--input) / <alpha-value>)",
                ring: "rgb(var(--ring) / <alpha-value>)",
                chart: {
                    1: "rgb(var(--chart-1) / <alpha-value>)",
                    2: "rgb(var(--chart-2) / <alpha-value>)",
                    3: "rgb(var(--chart-3) / <alpha-value>)",
                    4: "rgb(var(--chart-4) / <alpha-value>)",
                    5: "rgb(var(--chart-5) / <alpha-value>)",
                },
                sidebar: {
                    DEFAULT: "rgb(var(--sidebar) / <alpha-value>)",
                    foreground: "rgb(var(--sidebar-foreground) / <alpha-value>)",
                    primary: "rgb(var(--sidebar-primary) / <alpha-value>)",
                    "primary-foreground":
                        "rgb(var(--sidebar-primary-foreground) / <alpha-value>)",
                    accent: "rgb(var(--sidebar-accent) / <alpha-value>)",
                    "accent-foreground":
                        "rgb(var(--sidebar-accent-foreground) / <alpha-value>)",
                    border: "rgb(var(--sidebar-border) / <alpha-value>)",
                    ring: "rgb(var(--sidebar-ring) / <alpha-value>)",
                },

                // Design tokens (Wish blue ocean mode)
                surface: {
                    primary: "rgb(var(--bg-primary) / <alpha-value>)",
                    muted: "rgb(var(--bg-muted) / <alpha-value>)",
                    elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
                    card: "rgb(var(--bg-surface) / <alpha-value>)",
                },
                ink: {
                    primary: "rgb(var(--text-primary) / <alpha-value>)",
                    secondary: "rgb(var(--text-secondary) / <alpha-value>)",
                    tertiary: "rgb(var(--text-tertiary) / <alpha-value>)",
                },
                brand: {
                    primary: "rgb(var(--accent-primary) / <alpha-value>)",
                    light: "rgb(var(--accent-light) / <alpha-value>)",
                    sky: "rgb(var(--accent-sky) / <alpha-value>)",
                    mint: "rgb(var(--accent-mint) / <alpha-value>)",
                    coral: "rgb(var(--accent-coral) / <alpha-value>)",
                    warm: "rgb(var(--accent-warm) / <alpha-value>)",
                },
                stroke: {
                    subtle: "rgb(var(--border-subtle) / <alpha-value>)",
                    strong: "rgb(var(--border-strong) / <alpha-value>)",
                },
            },
            borderRadius: {
                sm: "calc(var(--radius) - 4px)",
                md: "calc(var(--radius) - 2px)",
                lg: "var(--radius)",
                xl: "calc(var(--radius) + 4px)",
            },
            boxShadow: {
                "2xs": "var(--shadow-2xs)",
                xs: "var(--shadow-xs)",
                sm: "var(--shadow-sm)",
                DEFAULT: "var(--shadow)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                xl: "var(--shadow-xl)",
                "2xl": "var(--shadow-2xl)",
            },
            letterSpacing: {
                tighter: "calc(var(--tracking-normal) - 0.05em)",
                tight: "calc(var(--tracking-normal) - 0.025em)",
                normal: "var(--tracking-normal)",
                wide: "calc(var(--tracking-normal) + 0.025em)",
                wider: "calc(var(--tracking-normal) + 0.05em)",
                widest: "calc(var(--tracking-normal) + 0.1em)",
            },
            fontFamily: {
                sans: ["var(--font-sans)", "sans-serif"],
                mono: ["var(--font-mono)", "monospace"],
            },
        },
    },
    plugins: [
        /** @param {{ addBase: (base: Record<string, Record<string, string>>) => void }} api */
        (api) => {
            const { addBase } = api;
            addBase({
                ":root": {
                    // Design-tokens namespace (Wish blue ocean mode)
                    "--bg-primary": "245 249 253",
                    "--bg-surface": "255 255 255",
                    "--bg-muted": "224 238 248",
                    "--bg-elevated": "235 244 251",
                    "--text-primary": "26 58 74",
                    "--text-secondary": "91 123 138",
                    "--text-tertiary": "139 171 186",
                    "--border-subtle": "200 222 240",
                    "--border-strong": "168 216 232",
                    "--accent-primary": "74 159 212",
                    "--accent-light": "212 235 247",
                    "--accent-sky": "90 173 224",
                    "--accent-mint": "107 184 232",
                    "--accent-coral": "239 160 138",
                    "--accent-warm": "245 201 168",

                    // Base semantic tokens (existing Tailwind classnames rely on these)
                    "--background": "245 249 253",
                    "--foreground": "26 58 74",
                    "--card": "255 255 255",
                    "--card-foreground": "26 58 74",
                    "--popover": "255 255 255",
                    "--popover-foreground": "26 58 74",
                    "--primary": "74 159 212",
                    "--primary-foreground": "255 255 255",
                    "--secondary": "212 235 247",
                    "--secondary-foreground": "26 58 74",
                    "--muted": "224 238 248",
                    "--muted-foreground": "91 123 138",
                    "--accent": "235 244 251",
                    "--accent-foreground": "74 159 212",
                    "--destructive": "220 40 40",
                    "--destructive-foreground": "255 255 255",
                    "--border": "200 222 240",
                    "--input": "255 255 255",
                    "--ring": "74 159 212",
                    "--chart-1": "74 159 212",
                    "--chart-2": "90 173 224",
                    "--chart-3": "107 184 232",
                    "--chart-4": "239 160 138",
                    "--chart-5": "245 201 168",
                    "--sidebar": "255 255 255",
                    "--sidebar-foreground": "91 123 138",
                    "--sidebar-primary": "74 159 212",
                    "--sidebar-primary-foreground": "255 255 255",
                    "--sidebar-accent": "212 235 247",
                    "--sidebar-accent-foreground": "74 159 212",
                    "--sidebar-border": "200 222 240",
                    "--sidebar-ring": "74 159 212",
                    "--radius": "0.75rem",
                    "--shadow-2xs": "0px 2px 12px 0px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow-xs": "0px 2px 12px 0px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow-sm":
                        "0px 2px 12px 0px rgba(26, 58, 74, 0.03137254901960784), 0px 1px 2px -1px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow":
                        "0px 2px 14px 0px rgba(26, 58, 74, 0.03137254901960784), 0px 1px 2px -1px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow-md":
                        "0px 6px 18px 0px rgba(26, 58, 74, 0.03137254901960784), 0px 2px 6px -2px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow-lg":
                        "0px 10px 24px 0px rgba(26, 58, 74, 0.03137254901960784), 0px 4px 10px -4px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow-xl":
                        "0px 16px 30px 0px rgba(26, 58, 74, 0.03137254901960784), 0px 6px 16px -6px rgba(26, 58, 74, 0.03137254901960784)",
                    "--shadow-2xl": "0px 22px 40px 0px rgba(26, 58, 74, 0.03137254901960784)",
                    "--tracking-normal": "0rem",
                },
                ".dark": {
                    // Design-tokens namespace (deep ocean dark mode)
                    "--bg-primary": "6 24 35",
                    "--bg-surface": "10 34 48",
                    "--bg-muted": "12 42 58",
                    "--bg-elevated": "14 50 70",
                    "--text-primary": "232 246 253",
                    "--text-secondary": "174 207 224",
                    "--text-tertiary": "127 165 184",
                    "--border-subtle": "22 56 74",
                    "--border-strong": "36 86 111",
                    "--accent-primary": "74 159 212",
                    "--accent-light": "18 54 75",
                    "--accent-sky": "90 173 224",
                    "--accent-mint": "107 184 232",
                    "--accent-coral": "239 160 138",
                    "--accent-warm": "245 201 168",

                    // Base semantic tokens
                    "--background": "6 24 35",
                    "--foreground": "232 246 253",
                    "--card": "10 34 48",
                    "--card-foreground": "232 246 253",
                    "--popover": "10 34 48",
                    "--popover-foreground": "232 246 253",
                    "--primary": "74 159 212",
                    "--primary-foreground": "255 255 255",
                    "--secondary": "18 54 75",
                    "--secondary-foreground": "232 246 253",
                    "--muted": "12 42 58",
                    "--muted-foreground": "174 207 224",
                    "--accent": "14 50 70",
                    "--accent-foreground": "74 159 212",
                    "--destructive": "161 38 38",
                    "--destructive-foreground": "255 255 255",
                    "--border": "22 56 74",
                    "--input": "10 34 48",
                    "--ring": "74 159 212",
                    "--chart-1": "74 159 212",
                    "--chart-2": "90 173 224",
                    "--chart-3": "107 184 232",
                    "--chart-4": "239 160 138",
                    "--chart-5": "245 201 168",
                    "--sidebar": "10 34 48",
                    "--sidebar-foreground": "174 207 224",
                    "--sidebar-primary": "74 159 212",
                    "--sidebar-primary-foreground": "255 255 255",
                    "--sidebar-accent": "18 54 75",
                    "--sidebar-accent-foreground": "74 159 212",
                    "--sidebar-border": "22 56 74",
                    "--sidebar-ring": "74 159 212",
                    "--shadow-2xs": "0px 2px 12px 0px rgba(0, 0, 0, 0.4)",
                    "--shadow-xs": "0px 2px 12px 0px rgba(0, 0, 0, 0.4)",
                    "--shadow-sm":
                        "0px 2px 12px 0px rgba(0, 0, 0, 0.4), 0px 1px 2px -1px rgba(0, 0, 0, 0.4)",
                    "--shadow":
                        "0px 2px 14px 0px rgba(0, 0, 0, 0.4), 0px 1px 2px -1px rgba(0, 0, 0, 0.4)",
                    "--shadow-md":
                        "0px 6px 18px 0px rgba(0, 0, 0, 0.4), 0px 2px 6px -2px rgba(0, 0, 0, 0.4)",
                    "--shadow-lg":
                        "0px 10px 24px 0px rgba(0, 0, 0, 0.4), 0px 4px 10px -4px rgba(0, 0, 0, 0.4)",
                    "--shadow-xl":
                        "0px 16px 30px 0px rgba(0, 0, 0, 0.4), 0px 6px 16px -6px rgba(0, 0, 0, 0.4)",
                    "--shadow-2xl": "0px 22px 40px 0px rgba(0, 0, 0, 0.4)",
                },
            });
        },
    ],
};
