// babel-preset-expo auto-detects react-native-reanimated/worklets and injects
// their plugin; we only need to layer NativeWind's JSX transform on top.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
