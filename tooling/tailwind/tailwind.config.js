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
                },
                ".dark": {
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
                },
            });
        },
    ],
};
