#import "NativeStripeWrapper.h"

#if __has_include(<StripeConnectWrapper/NativeStripeWrapper-Swift.h>)
#import <StripeConnectWrapper/NativeStripeWrapper-Swift.h>
#else
#import "NativeStripeWrapper-Swift.h"
#endif

@interface NativeStripeWrapper () <StripeConnectBridgeDelegate>
@end

@implementation NativeStripeWrapper {
    StripeConnectBridge *_bridge;
    BOOL _hasListeners;
    void (^_onboardingResolve)(NSString *);
    void (^_onboardingReject)(NSString *, NSString *, NSError *);
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _bridge = [[StripeConnectBridge alloc] init];
        _bridge.delegate = self;
    }
    return self;
}

+ (NSString *)moduleName {
    return @"NativeStripeWrapper";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeNativeStripeWrapperSpecJSI>(params);
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

#pragma mark - RCTEventEmitter

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onFetchClientSecret", @"onLoadError"];
}

- (void)startObserving {
    _hasListeners = YES;
}

- (void)stopObserving {
    _hasListeners = NO;
}

#pragma mark - TurboModule methods

- (void)initialize:(NSString *)publishableKey {
    [_bridge initializeWithPublishableKey:publishableKey];
}

- (void)presentAccountOnboarding:(NSDictionary *)options
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
    _onboardingResolve = resolve;
    _onboardingReject = reject;

    NSString *fullTermsOfServiceUrl = options[@"fullTermsOfServiceUrl"];
    NSString *recipientTermsOfServiceUrl = options[@"recipientTermsOfServiceUrl"];
    NSString *privacyPolicyUrl = options[@"privacyPolicyUrl"];

    NSString *collectionFields = nil;
    NSString *collectionFutureRequirements = nil;
    NSDictionary *collectionOptions = options[@"collectionOptions"];
    if (collectionOptions) {
        collectionFields = collectionOptions[@"fields"];
        collectionFutureRequirements = collectionOptions[@"futureRequirements"];
    }

    dispatch_async(dispatch_get_main_queue(), ^{
        UIViewController *rootVC = [UIApplication sharedApplication].delegate.window.rootViewController;
        while (rootVC.presentedViewController) {
            rootVC = rootVC.presentedViewController;
        }

        [self->_bridge presentAccountOnboardingFrom:rootVC
                           fullTermsOfServiceUrl:fullTermsOfServiceUrl
                      recipientTermsOfServiceUrl:recipientTermsOfServiceUrl
                               privacyPolicyUrl:privacyPolicyUrl
                        collectionOptionsFields:collectionFields
                collectionOptionsFutureRequirements:collectionFutureRequirements];
    });
}

- (void)provideClientSecret:(NSString *)secret {
    [_bridge provideClientSecret:secret];
}

- (void)addListener:(NSString *)eventName {
    // Required for RCTEventEmitter
}

- (void)removeListeners:(double)count {
    // Required for RCTEventEmitter
}

#pragma mark - StripeConnectBridgeDelegate

- (void)bridgeDidRequestClientSecret {
    if (_hasListeners) {
        [self sendEventWithName:@"onFetchClientSecret" body:@{}];
    }
}

- (void)bridgeDidExit {
    if (_onboardingResolve) {
        _onboardingResolve(@"exited");
        _onboardingResolve = nil;
        _onboardingReject = nil;
    }
}

- (void)bridgeDidFailLoadWithType:(NSString *)type message:(NSString *)message {
    if (_hasListeners) {
        [self sendEventWithName:@"onLoadError" body:@{@"type": type, @"message": message}];
    }
}

@end
