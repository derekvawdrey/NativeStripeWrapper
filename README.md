# @banrendi/stripe-connect-wrapper

A React Native wrapper around the native [Stripe Connect iOS](https://github.com/stripe/stripe-ios/tree/master/StripeConnect) and [Android](https://github.com/stripe/stripe-android) SDKs, providing the **embedded Account Onboarding** component for connected account onboarding flows.

This library uses the native `EmbeddedComponentManager` and `AccountOnboardingController` on each platform, so your connected accounts get a fully native, localized, and Stripe-themed onboarding experience without leaving your app.

## Features

- Native fullscreen Account Onboarding modal on iOS and Android
- Async `fetchClientSecret` bridge -- the SDK automatically refreshes expired sessions
- Configurable Terms of Service and Privacy Policy URLs
- Collection options (`currently_due` / `eventually_due`, `futureRequirements`)
- Load error event listener
- Compatible with Expo development builds

## Requirements

| Platform | Minimum Version |
|----------|----------------|
| iOS      | 15.0           |
| Android  | API 24         |
| React Native | 0.76+     |

## Installation

```sh
npm install @banrendi/stripe-connect-wrapper
# or
yarn add @banrendi/stripe-connect-wrapper
```

### iOS

Install the CocoaPods dependencies:

```sh
cd ios && pod install
```

The `StripeConnect` pod is pulled in automatically through this library's podspec.

Add `NSCameraUsageDescription` to your `Info.plist` (required by the Stripe Connect SDK for identity document capture during onboarding):

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to capture identity documents during account onboarding.</string>
```

### Android

No additional setup required. The `com.stripe:connect` dependency is included automatically via Gradle.

### Expo

This library works with Expo **development builds** (`expo prebuild` / EAS Build). It does **not** work with Expo Go since it contains native code.

Add `NSCameraUsageDescription` to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to capture identity documents during account onboarding."
      }
    }
  }
}
```

## Server-side Setup

Before using the client-side library, your server needs to:

1. **Create a connected account** using the [Accounts API](https://docs.stripe.com/api/accounts/create) (v1) or [Accounts v2 API](https://docs.stripe.com/api/v2/core/accounts/create).

2. **Create an Account Session** that enables the `account_onboarding` component:

```js
const stripe = require('stripe')('sk_test_...');

const accountSession = await stripe.accountSessions.create({
  account: 'acct_CONNECTED_ACCOUNT_ID',
  components: {
    account_onboarding: {
      enabled: true,
      features: {
        // Recommended for custom accounts:
        disable_stripe_user_authentication: true,
      },
    },
  },
});

// Return accountSession.client_secret to the client
```

3. **Expose an endpoint** that your app calls to get the `client_secret`.

## Usage

### Initialize

Call `initialize` once at app startup with your Stripe publishable key and an async function that fetches a fresh `client_secret` from your server:

```tsx
import { useEffect } from 'react';
import { initialize } from '@banrendi/stripe-connect-wrapper';

function App() {
  useEffect(() => {
    initialize('pk_test_YOUR_PUBLISHABLE_KEY', async () => {
      const response = await fetch('https://your-server.com/account_session', {
        method: 'POST',
      });
      const { client_secret } = await response.json();
      return client_secret;
    });
  }, []);

  // ...
}
```

The `fetchClientSecret` callback may be called multiple times -- when the component first loads and whenever the session needs to be refreshed. Always return a fresh `client_secret` from a new Account Session.

### Present Account Onboarding

Call `presentAccountOnboarding` to show the fullscreen onboarding modal. It returns a Promise that resolves when the user exits:

```tsx
import { presentAccountOnboarding } from '@banrendi/stripe-connect-wrapper';

async function startOnboarding() {
  await presentAccountOnboarding();
  // User exited -- check account status on your server
}
```

### Options

Pass an options object to customize the onboarding flow:

```tsx
await presentAccountOnboarding({
  // Replace Stripe's default ToS/privacy links with your own
  fullTermsOfServiceUrl: 'https://example.com/terms',
  recipientTermsOfServiceUrl: 'https://example.com/recipient-terms',
  privacyPolicyUrl: 'https://example.com/privacy',

  // Control which requirements are collected
  collectionOptions: {
    // 'currently_due' (default) or 'eventually_due' (collects all up front)
    fields: 'eventually_due',
    // 'omit' (default) or 'include' (also collects future requirements)
    futureRequirements: 'include',
  },
});
```

### Listen for Load Errors

Subscribe to load errors that occur when the onboarding component fails to load:

```tsx
import { useEffect } from 'react';
import { onLoadError } from '@banrendi/stripe-connect-wrapper';

useEffect(() => {
  const unsubscribe = onLoadError((error) => {
    console.warn(`Onboarding load error: ${error.type} - ${error.message}`);
  });
  return unsubscribe;
}, []);
```

## API Reference

### `initialize(publishableKey, fetchClientSecret)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `publishableKey` | `string` | Your Stripe publishable key |
| `fetchClientSecret` | `() => Promise<string \| null>` | Async function that fetches a fresh Account Session `client_secret` from your server |

### `presentAccountOnboarding(options?)`

Returns `Promise<void>` that resolves when the user exits the onboarding flow.

| Option | Type | Description |
|--------|------|-------------|
| `fullTermsOfServiceUrl` | `string?` | URL to your full terms of service |
| `recipientTermsOfServiceUrl` | `string?` | URL to your recipient terms of service |
| `privacyPolicyUrl` | `string?` | URL to your privacy policy |
| `collectionOptions` | `CollectionOptions?` | Controls which requirements are collected |

#### `CollectionOptions`

| Field | Type | Description |
|-------|------|-------------|
| `fields` | `'currently_due' \| 'eventually_due'` | Which requirement set to collect. Default: `'currently_due'` |
| `futureRequirements` | `'omit' \| 'include'` | Whether to include future requirements. Default: `'omit'` |
| `requirements` | `{ exclude: string[] } \| { only: string[] }` | Fine-grained requirement restrictions |

### `onLoadError(callback)`

Returns an unsubscribe function.

| Parameter | Type | Description |
|-----------|------|-------------|
| `callback` | `(error: { type: string; message: string }) => void` | Called when the onboarding component fails to load |

### Events

| Event | Description |
|-------|-------------|
| `onFetchClientSecret` | Emitted internally when the native SDK needs a client secret. Handled automatically by `initialize`. |
| `onLoadError` | Emitted when the component fails to load. Subscribe via `onLoadError()`. |

## Full Example

```tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  initialize,
  presentAccountOnboarding,
  onLoadError,
} from '@banrendi/stripe-connect-wrapper';

const API_URL = 'https://your-server.com';

export default function App() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initialize('pk_test_YOUR_KEY', async () => {
      const res = await fetch(`${API_URL}/account_session`, { method: 'POST' });
      const { client_secret } = await res.json();
      return client_secret;
    });

    const unsubscribe = onLoadError((error) => {
      Alert.alert('Load Error', `${error.type}: ${error.message}`);
    });

    return unsubscribe;
  }, []);

  const handleOnboarding = async () => {
    setLoading(true);
    try {
      await presentAccountOnboarding({
        collectionOptions: {
          fields: 'eventually_due',
          futureRequirements: 'include',
        },
      });
      Alert.alert('Success', 'Onboarding completed');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleOnboarding} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Start Onboarding</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: {
    backgroundColor: '#635bff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

## How It Works

The library bridges React Native to the native Stripe Connect SDKs:

1. **`initialize`** sets the Stripe publishable key on the native side and creates an `EmbeddedComponentManager` with a `fetchClientSecret` callback.

2. When the SDK needs a client secret (on first load or session refresh), the native side suspends using a `CheckedContinuation` (iOS) or `CompletableDeferred` (Android) and emits an event to JavaScript.

3. The JS event listener calls your `fetchClientSecret` function, then passes the result back to the native side via `provideClientSecret`, which resumes the suspended native callback.

4. **`presentAccountOnboarding`** creates an `AccountOnboardingController` and presents it fullscreen. The returned Promise resolves when the user exits the flow.

## Contributing

See the [contributing guide](CONTRIBUTING.md) for development workflow instructions.

## License

MIT
