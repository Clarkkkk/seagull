module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // NativeWind's Babel entry is a preset (it returns `{ plugins: [...] }`)
      "nativewind/babel",
    ],
    plugins: [],
  };
};

