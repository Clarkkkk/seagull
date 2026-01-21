// Learn more: https://docs.expo.dev/guides/monorepos/
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

/** @type {import('expo/metro-config').MetroConfig} */
module.exports = withNativeWind(config, {
  configPath: path.join(__dirname, "tailwind.config.js"),
  input: path.join(__dirname, "src", "styles.css"),
});
