const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POD_LINE = "  pod 'StripeConnect', '~> 25.7'";
const TAG = '@banrendi/stripe-connect-wrapper-stripeconnect-pod';

/**
 * Expo config plugin that adds the StripeConnect CocoaPod to the app's Podfile.
 * Use this when the wrapper's transitive pod dependency isn't resolved (e.g. with Expo / GitHub / file: installs).
 *
 * In app.json / app.config.js:
 *   "plugins": ["@banrendi/stripe-connect-wrapper/expo-plugin"]
 */
function withStripeConnectPod(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(podfilePath, 'utf8');

      // Idempotent: remove our previous injection so we don't duplicate
      contents = contents.replace(new RegExp(`\\s*# ${TAG}\\n\\s*${POD_LINE.trim()}\\n`, 'g'), '');

      // Insert inside the main target, after use_native_modules! or use_expo_modules!
      const anchor = /(use_native_modules!|use_expo_modules!)/;
      const match = contents.match(anchor);
      if (match) {
        const insertIndex = match.index + match[0].length;
        const before = contents.slice(0, insertIndex);
        const after = contents.slice(insertIndex);
        const lineEnd = before.match(/\n[ \t]*$/)?.[0] ?? '\n';
        contents = before + lineEnd + `  # ${TAG}` + '\n' + POD_LINE + '\n' + after;
      } else {
        // Fallback: append before the first 'end' that closes the target
        const endMatch = contents.match(/\n(\s*)end\s*(\n|$)/);
        if (endMatch) {
          const indent = endMatch[1] || '  ';
          contents = contents.replace(/\n(\s*)end\s*(\n|$)/, `\n${indent}# ${TAG}\n${indent}${POD_LINE.trim()}\n${endMatch[0]}`);
        }
      }

      await fs.promises.writeFile(podfilePath, contents, 'utf8');
      return config;
    },
  ]);
}

module.exports = withStripeConnectPod;
