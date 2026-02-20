import { NativeEventEmitter, Platform } from 'react-native';
import NativeStripeWrapper from './NativeNativeStripeWrapper';

export type CollectionOptionsFields = 'currently_due' | 'eventually_due';
export type FutureRequirements = 'omit' | 'include';

export interface CollectionOptions {
  fields?: CollectionOptionsFields;
  futureRequirements?: FutureRequirements;
  requirements?: { exclude: string[] } | { only: string[] };
}

export interface AccountOnboardingOptions {
  fullTermsOfServiceUrl?: string;
  recipientTermsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
  collectionOptions?: CollectionOptions;
}

type FetchClientSecret = () => Promise<string | null>;

const emitter = new NativeEventEmitter(
  Platform.OS === 'ios' ? NativeStripeWrapper : undefined
);

let fetchClientSecretCallback: FetchClientSecret | null = null;
let listenerSubscription: ReturnType<
  typeof emitter.addListener
> | null = null;

export function initialize(
  publishableKey: string,
  fetchClientSecret: FetchClientSecret
): void {
  fetchClientSecretCallback = fetchClientSecret;

  if (listenerSubscription) {
    listenerSubscription.remove();
  }

  listenerSubscription = emitter.addListener(
    'onFetchClientSecret',
    async () => {
      if (!fetchClientSecretCallback) {
        NativeStripeWrapper.provideClientSecret(null);
        return;
      }
      try {
        const secret = await fetchClientSecretCallback();
        NativeStripeWrapper.provideClientSecret(secret);
      } catch {
        NativeStripeWrapper.provideClientSecret(null);
      }
    }
  );

  NativeStripeWrapper.initialize(publishableKey);
}

export async function presentAccountOnboarding(
  options?: AccountOnboardingOptions
): Promise<void> {
  const nativeOptions: Record<string, unknown> = {};

  if (options?.fullTermsOfServiceUrl) {
    nativeOptions.fullTermsOfServiceUrl = options.fullTermsOfServiceUrl;
  }
  if (options?.recipientTermsOfServiceUrl) {
    nativeOptions.recipientTermsOfServiceUrl =
      options.recipientTermsOfServiceUrl;
  }
  if (options?.privacyPolicyUrl) {
    nativeOptions.privacyPolicyUrl = options.privacyPolicyUrl;
  }
  if (options?.collectionOptions) {
    nativeOptions.collectionOptions = options.collectionOptions;
  }

  await NativeStripeWrapper.presentAccountOnboarding(nativeOptions);
}

export function onLoadError(
  callback: (error: { type: string; message: string }) => void
): () => void {
  const sub = emitter.addListener('onLoadError', callback);
  return () => sub.remove();
}
