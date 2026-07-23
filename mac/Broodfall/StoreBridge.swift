import Foundation
import StoreKit
import WebKit

// StoreKit 2 bridge for the in-game paywall. JS counterpart: `BFStore` in
// game.js — it posts {cmd: "state" | "buy" | "restore"} on
// webkit.messageHandlers.bfstore and receives state via
// BFStore._update({owned, price, debug, error?}). The game fails closed until
// the first push arrives, so every path here must end in a push().
final class StoreBridge: NSObject, WKScriptMessageHandler {
    static let productID = "com.bronsongannon.broodfall.full"

    weak var webView: WKWebView?
    private var product: Product?
    private var owned = false
    private var updatesTask: Task<Void, Never>?

    func attach(to configuration: WKWebViewConfiguration) {
        configuration.userContentController.add(self, name: "bfstore")
    }

    func start() {
        // Ask-to-buy approvals, refunds, and family-sharing changes arrive
        // here; unfinished transactions must be finished or they redeliver.
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                if case .verified(let transaction) = update {
                    await transaction.finish()
                }
                await self?.refresh()
            }
        }
        Task { await refresh() }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - Messages from JS

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "bfstore",
              let body = message.body as? [String: Any],
              let cmd = body["cmd"] as? String else { return }
        switch cmd {
        case "state": Task { await refresh() }
        case "buy": Task { await buy() }
        case "restore": Task { await restore() }
        default: break
        }
    }

    // MARK: - StoreKit

    @MainActor
    private func refresh(error: String? = nil) async {
        if product == nil {
            product = try? await Product.products(for: [Self.productID]).first
        }
        // currentEntitlements is served from the local transaction cache, so
        // ownership survives offline launches after the first verified check.
        var isOwned = false
        for await entitlement in Transaction.currentEntitlements {
            if case .verified(let transaction) = entitlement,
               transaction.productID == Self.productID,
               transaction.revocationDate == nil {
                isOwned = true
            }
        }
        owned = isOwned
        push(error: error)
    }

    @MainActor
    private func buy() async {
        guard !owned else { push(); return }
        if product == nil {
            product = try? await Product.products(for: [Self.productID]).first
        }
        guard let product else {
            push(error: "The App Store is unreachable right now. Check your connection and try again.")
            return
        }
        do {
            switch try await product.purchase() {
            case .success(let verification):
                if case .verified(let transaction) = verification {
                    await transaction.finish()
                    await refresh()
                } else {
                    await refresh(error: "The purchase could not be verified. Try Restore purchase.")
                }
            case .userCancelled:
                push()
            case .pending:
                push(error: "Purchase waiting for approval — it unlocks automatically once approved.")
            @unknown default:
                await refresh()
            }
        } catch {
            await refresh(error: "Purchase failed: \(error.localizedDescription)")
        }
    }

    @MainActor
    private func restore() async {
        do {
            try await AppStore.sync()
            await refresh()
        } catch {
            // sync() also throws when the user dismisses the sign-in sheet —
            // report and fall back to whatever the entitlement cache says.
            await refresh(error: "Restore didn't complete: \(error.localizedDescription)")
        }
    }

    // MARK: - State push to JS

    @MainActor
    private func push(error: String? = nil) {
        #if DEBUG
        let debug = true
        #else
        let debug = false
        #endif
        var state: [String: Any] = ["owned": owned, "debug": debug]
        if let product {
            state["price"] = product.displayPrice
        }
        if let error {
            state["error"] = error
        }
        guard let data = try? JSONSerialization.data(withJSONObject: state),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.BFStore && BFStore._update(\(json))")
    }
}
