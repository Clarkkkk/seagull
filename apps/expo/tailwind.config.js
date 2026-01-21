const baseConfig = require("@acme/tailwind-config/config");

/** @type {import('tailwindcss').Config} */
module.exports = {
    // On native we prefer following the system scheme for `dark:` variants.
    darkMode: "media",
    presets: [require("nativewind/preset")],
    ...baseConfig,
    content: [
        "./index.ts",
        "./src/**/*.{js,ts,jsx,tsx}",
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    ],
};
