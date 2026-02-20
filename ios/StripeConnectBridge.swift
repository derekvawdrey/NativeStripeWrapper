import Foundation
import UIKit
import StripeConnect

@objc public protocol StripeConnectBridgeDelegate: AnyObject {
    func bridgeDidRequestClientSecret()
    func bridgeDidExit()
    func bridgeDidFailLoad(type: String, message: String)
}

@objc public class StripeConnectBridge: NSObject, @unchecked Sendable {

    @objc public weak var delegate: StripeConnectBridgeDelegate?

    private var embeddedComponentManager: EmbeddedComponentManager?
    private var onboardingController: AccountOnboardingController?
    private var clientSecretContinuation: CheckedContinuation<String?, Never>?
    private var publishableKey: String?

    @objc public func initialize(publishableKey: String) {
        self.publishableKey = publishableKey
        STPAPIClient.shared.publishableKey = publishableKey

        embeddedComponentManager = EmbeddedComponentManager(
            fetchClientSecret: { [weak self] in
                guard let self else { return nil }
                return await self.requestClientSecret()
            }
        )
    }

    @objc public func presentAccountOnboarding(
        from viewController: UIViewController,
        fullTermsOfServiceUrl: String?,
        recipientTermsOfServiceUrl: String?,
        privacyPolicyUrl: String?,
        collectionOptionsFields: String?,
        collectionOptionsFutureRequirements: String?
    ) {
        guard let manager = embeddedComponentManager else { return }

        var fullUrl: URL?
        if let urlString = fullTermsOfServiceUrl {
            fullUrl = URL(string: urlString)
        }
        var recipientUrl: URL?
        if let urlString = recipientTermsOfServiceUrl {
            recipientUrl = URL(string: urlString)
        }
        var privacyUrl: URL?
        if let urlString = privacyPolicyUrl {
            privacyUrl = URL(string: urlString)
        }

        var collectionOptions = AccountCollectionOptions()
        if let fields = collectionOptionsFields {
            switch fields {
            case "eventually_due":
                collectionOptions.fields = .eventuallyDue
            default:
                collectionOptions.fields = .currentlyDue
            }
        }
        if let future = collectionOptionsFutureRequirements {
            switch future {
            case "include":
                collectionOptions.futureRequirements = .include
            default:
                collectionOptions.futureRequirements = .omit
            }
        }

        let controller = manager.createAccountOnboardingController(
            fullTermsOfServiceUrl: fullUrl,
            recipientTermsOfServiceUrl: recipientUrl,
            privacyPolicyUrl: privacyUrl,
            collectionOptions: collectionOptions
        )

        controller.delegate = self
        self.onboardingController = controller
        controller.present(from: viewController)
    }

    @objc public func provideClientSecret(_ secret: String?) {
        clientSecretContinuation?.resume(returning: secret)
        clientSecretContinuation = nil
    }

    private func requestClientSecret() async -> String? {
        return await withCheckedContinuation { continuation in
            self.clientSecretContinuation = continuation
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.bridgeDidRequestClientSecret()
            }
        }
    }
}

extension StripeConnectBridge: AccountOnboardingControllerDelegate {
    public func accountOnboardingDidExit(_ accountOnboarding: AccountOnboardingController) {
        onboardingController = nil
        delegate?.bridgeDidExit()
    }

    public func accountOnboarding(
        _ accountOnboarding: AccountOnboardingController,
        didFailLoadWithError error: Error
    ) {
        let nsError = error as NSError
        delegate?.bridgeDidFailLoad(
            type: nsError.domain,
            message: nsError.localizedDescription
        )
    }
}
