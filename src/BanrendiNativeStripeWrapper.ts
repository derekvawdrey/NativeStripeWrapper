import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  initialize(publishableKey: string): void;
  presentAccountOnboarding(options: Object): Promise<string>;
  provideClientSecret(secret: string | null): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeStripeWrapper');
