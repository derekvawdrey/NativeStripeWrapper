package com.banrendi.stripeconnectwrapper

import com.facebook.react.bridge.ReactApplicationContext

class NativeStripeWrapperModule(reactContext: ReactApplicationContext) :
  NativeNativeStripeWrapperSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeNativeStripeWrapperSpec.NAME
  }
}
