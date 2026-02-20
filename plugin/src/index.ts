import {
  type ConfigPlugin,
  withInfoPlist,
} from 'expo/config-plugins';

interface PluginOptions {
  cameraPermissionText?: string;
}

const DEFAULT_CAMERA_TEXT =
  'This app uses the camera to capture identity documents during account onboarding.';

const withStripeConnectWrapper: ConfigPlugin<PluginOptions | void> = (
  config,
  options
) => {
  const cameraText = options?.cameraPermissionText ?? DEFAULT_CAMERA_TEXT;

  config = withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.NSCameraUsageDescription) {
      cfg.modResults.NSCameraUsageDescription = cameraText;
    }
    return cfg;
  });

  return config;
};

export default withStripeConnectWrapper;
