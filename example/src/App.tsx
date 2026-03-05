import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  initialize,
  presentAccountOnboarding,
  onLoadError,
  enableClientSecretDebug,
} from '@banrendi/stripe-connect-wrapper';

const PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE';
const ACCOUNT_SESSION_URL = 'https://your-server.example.com/account_session';

// Log client-secret flow to debug infinite spinner in the modal.
if (__DEV__) enableClientSecretDebug(true);

async function fetchClientSecret(): Promise<string | null> {
  try {
    const response = await fetch(ACCOUNT_SESSION_URL, { method: 'POST' });
    if (!response.ok) {
      if (__DEV__) console.warn('[fetchClientSecret] response not ok', response.status);
      return null;
    }
    const data = await response.json();
    const client_secret = data?.client_secret ?? null;
    if (__DEV__) console.log('[fetchClientSecret] got secret?', !!client_secret);
    return client_secret;
  } catch (e) {
    if (__DEV__) console.warn('[fetchClientSecret] error', e);
    return null;
  }
}

export default function App() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initialize(PUBLISHABLE_KEY, fetchClientSecret);

    const unsubscribe = onLoadError((error) => {
      Alert.alert('Load Error', `${error.type}: ${error.message}`);
    });

    return unsubscribe;
  }, []);

  const handleOnboarding = async () => {
    setLoading(true);
    try {
      await presentAccountOnboarding({
        // fullTermsOfServiceUrl: 'https://example.com/terms',
        // recipientTermsOfServiceUrl: 'https://example.com/recipient-terms',
        // privacyPolicyUrl: 'https://example.com/privacy',
        // collectionOptions: {
        //   fields: 'eventually_due',
        //   futureRequirements: 'include',
        // },
      });
      Alert.alert('Done', 'Onboarding flow completed');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stripe Connect Onboarding</Text>
      <Text style={styles.subtitle}>
        Tap the button below to launch the embedded onboarding flow.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleOnboarding}
        disabled={loading}
      >
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 15,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#635bff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
