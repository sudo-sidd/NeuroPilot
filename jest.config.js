
module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-push-notification)/)',
  ],
  setupFiles: ['./jest/setup.js'],
};
