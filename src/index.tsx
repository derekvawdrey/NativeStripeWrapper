import { NativeEventEmitter, Platform } from 'react-native';
import NativeStripeWrapper from './BanrendiNativeStripeWrapper';

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
let listenerSubscription: ReturnType<typeof emitter.addListener> | null = null;

/** Set to true to log client-secret flow to console (for debugging infinite spinner). */
export let __DEBUG_CLIENT_SECRET = false;

export function enableClientSecretDebug(enabled: boolean): void {
  __DEBUG_CLIENT_SECRET = enabled;
}

function logDebug(msg: string, data?: unknown) {
  if (__DEBUG_CLIENT_SECRET) {
    const payload = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    console.log(`[StripeConnect] ${msg}${payload}`);
  }
}

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
      logDebug('onFetchClientSecret received');
      if (!fetchClientSecretCallback) {
        logDebug('provideClientSecret(null) — no fetch callback');
        NativeStripeWrapper.provideClientSecret(null);
        return;
      }
      try {
        const secret = await fetchClientSecretCallback();
        logDebug('fetchClientSecret resolved', {
          hasSecret: !!secret,
          secretLength: secret?.length ?? 0,
        });
        NativeStripeWrapper.provideClientSecret(secret);
      } catch (e) {
        logDebug('fetchClientSecret threw', e);
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
  const sub = emitter.addListener('onLoadError', (event: any) => {
    callback({
      type: String(event?.type ?? 'unknown'),
      message: String(event?.message ?? ''),
    });
  });
  return () => sub.remove();
}
