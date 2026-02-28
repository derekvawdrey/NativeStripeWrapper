package com.banrendi.stripeconnectwrapper

import android.app.Activity
import android.app.Application
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.stripe.android.connect.AccountOnboardingController
import com.stripe.android.connect.AccountOnboardingListener
import com.stripe.android.connect.AccountOnboardingProps
import com.stripe.android.connect.EmbeddedComponentManager
import com.stripe.android.connect.FetchClientSecret
import com.stripe.android.connect.StripeComponentController
import kotlinx.coroutines.CompletableDeferred

class BanrendiNativeStripeWrapperModule(reactContext: ReactApplicationContext) :
    NativeNativeStripeWrapperSpec(reactContext) {

    private var publishableKey: String? = null
    private var embeddedComponentManager: EmbeddedComponentManager? = null
    private var accountOnboardingController: AccountOnboardingController? = null
    private var clientSecretDeferred: CompletableDeferred<String?>? = null
    private var onboardingPromise: Promise? = null
    private var activityCallbacksRegistered = false

    companion object {
        const val NAME = NativeNativeStripeWrapperSpec.NAME
    }

    override fun initialize(publishableKey: String) {
        this.publishableKey = publishableKey

        embeddedComponentManager = EmbeddedComponentManager(
            publishableKey = publishableKey,
            fetchClientSecret = FetchClientSecret {
                val deferred = CompletableDeferred<String?>()
                clientSecretDeferred = deferred
                sendEvent("onFetchClientSecret", Arguments.createMap())
                deferred.await()
            }
        )

        ensureActivityCallbacksRegistered()
    }

    override fun presentAccountOnboarding(options: ReadableMap, promise: Promise) {
        val manager = embeddedComponentManager
        if (manager == null) {
            promise.reject("ERR_NOT_INITIALIZED", "Call initialize() before presenting onboarding")
            return
        }

        onboardingPromise = promise

        val activity = currentActivity
        if (activity == null || activity !is FragmentActivity) {
            promise.reject("ERR_NO_ACTIVITY", "No FragmentActivity available")
            onboardingPromise = null
            return
        }

        var fullTermsOfServiceUrl: String? = null
        var recipientTermsOfServiceUrl: String? = null
        var privacyPolicyUrl: String? = null
        var collectionOptions: AccountOnboardingProps.CollectionOptions? = null

        if (options.hasKey("fullTermsOfServiceUrl")) {
            fullTermsOfServiceUrl = options.getString("fullTermsOfServiceUrl")
        }
        if (options.hasKey("recipientTermsOfServiceUrl")) {
            recipientTermsOfServiceUrl = options.getString("recipientTermsOfServiceUrl")
        }
        if (options.hasKey("privacyPolicyUrl")) {
            privacyPolicyUrl = options.getString("privacyPolicyUrl")
        }
        if (options.hasKey("collectionOptions")) {
            val co = options.getMap("collectionOptions")
            if (co != null) {
                var fieldOption: AccountOnboardingProps.FieldOption? = null
                var futureOption: AccountOnboardingProps.FutureRequirementOption? = null

                if (co.hasKey("fields")) {
                    fieldOption = when (co.getString("fields")) {
                        "eventually_due" -> AccountOnboardingProps.FieldOption.EVENTUALLY_DUE
                        else -> AccountOnboardingProps.FieldOption.CURRENTLY_DUE
                    }
                }
                if (co.hasKey("futureRequirements")) {
                    futureOption = when (co.getString("futureRequirements")) {
                        "include" -> AccountOnboardingProps.FutureRequirementOption.INCLUDE
                        else -> AccountOnboardingProps.FutureRequirementOption.OMIT
                    }
                }

                collectionOptions = AccountOnboardingProps.CollectionOptions(
                    fields = fieldOption,
                    futureRequirements = futureOption,
                )
            }
        }

        val props = AccountOnboardingProps(
            fullTermsOfServiceUrl = fullTermsOfServiceUrl,
            recipientTermsOfServiceUrl = recipientTermsOfServiceUrl,
            privacyPolicyUrl = privacyPolicyUrl,
            collectionOptions = collectionOptions,
        )

        activity.runOnUiThread {
            val controller = manager.createAccountOnboardingController(
                activity = activity,
                props = props,
            )

            controller.listener = object : AccountOnboardingListener {
                override fun onExit() {
                    onboardingPromise?.resolve("exited")
                    onboardingPromise = null
                    accountOnboardingController = null
                }

                override fun onLoadError(error: Throwable) {
                    val params = Arguments.createMap().apply {
                        putString("type", "load_error")
                        putString("message", error.message ?: "Unknown error")
                    }
                    sendEvent("onLoadError", params)
                }
            }

            controller.onDismissListener = StripeComponentController.OnDismissListener {
                if (onboardingPromise != null) {
                    onboardingPromise?.resolve("exited")
                    onboardingPromise = null
                }
                accountOnboardingController = null
            }

            accountOnboardingController = controller
            controller.show()
        }
    }

    override fun provideClientSecret(secret: String?) {
        clientSecretDeferred?.complete(secret)
        clientSecretDeferred = null
    }

    override fun addListener(eventName: String?) {
        // Required for event emitter support
    }

    override fun removeListeners(count: Double) {
        // Required for event emitter support
    }

    private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun ensureActivityCallbacksRegistered() {
        if (activityCallbacksRegistered) return
        activityCallbacksRegistered = true

        val activity = currentActivity ?: return
        val app = activity.application

        app.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
                if (activity is FragmentActivity) {
                    EmbeddedComponentManager.onActivityCreate(activity)
                }
            }
            override fun onActivityStarted(activity: Activity) {}
            override fun onActivityResumed(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivityStopped(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })

        if (activity is FragmentActivity) {
            EmbeddedComponentManager.onActivityCreate(activity)
        }
    }
}
