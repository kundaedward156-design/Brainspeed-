const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// These packages ship index.js but no "main"/"exports". With Expo's package
// exports resolver, Metro reports them as "could not be found" on EAS.
const ENTRY = {
  'query-string': 'query-string/index.js',
  'decode-uri-component': 'decode-uri-component/index.js',
  'filter-obj': 'filter-obj/index.js',
  'split-on-first': 'split-on-first/index.js',
  'strict-uri-encode': 'strict-uri-encode/index.js',
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const rel = ENTRY[moduleName];
  if (rel) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules', rel),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
