const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');

const root = path.resolve(__dirname, '..');

/** Resolve package root for @banrendi/stripe-connect-wrapper (workspace or node_modules) */
function getStripeConnectWrapperSourcePath() {
  try {
    const pkgJson = require.resolve('@banrendi/stripe-connect-wrapper/package.json');
    return path.join(path.dirname(pkgJson), 'src', 'index.tsx');
  } catch {
    return null;
  }
}

const stripeConnectWrapperSource = getStripeConnectWrapperSourcePath();

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * Resolves @banrendi/stripe-connect-wrapper to its source (src/index.tsx) so the app
 * works when lib/ is missing (e.g. installs from GitHub tarball where lib/ is gitignored).
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});

if (stripeConnectWrapperSource) {
  const defaultResolver = require('metro-resolver').resolve;
  config.resolver = {
    ...config.resolver,
    resolveRequest(context, moduleName, platform) {
      if (moduleName === '@banrendi/stripe-connect-wrapper') {
        return { type: 'sourceFile', filePath: stripeConnectWrapperSource };
      }
      return defaultResolver(
        { ...context, resolveRequest: null },
        moduleName,
        platform
      );
    },
  };
}

module.exports = config;
