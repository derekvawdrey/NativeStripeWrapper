import { NativeModules } from 'react-native';

export interface Spec {
  initialize(publishableKey: string): void;
  presentAccountOnboarding(options: Object): Promise<string>;
  provideClientSecret(secret: string | null): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const { NativeStripeWrapper } = NativeModules;
if (!NativeStripeWrapper) {
  throw new Error('NativeStripeWrapper native module is not available');
}
export default NativeStripeWrapper as Spec;
