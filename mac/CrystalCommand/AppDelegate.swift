import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!

    // MARK: - Lifecycle

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenuBar()
        buildWindow()
        loadGame()
    }

    // Closing the game window quits the app — a single-window game should not
    // linger as a dockless process (review guideline: behave like a real app).
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    // MARK: - Window + web view

    private func buildWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        // The game gates all audio behind its own first-click init; don't make
        // WebKit demand a second gesture for the briefing voice lines.
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.allowsMagnification = false
        webView.allowsBackForwardNavigationGestures = false
        if #available(macOS 12.0, *) {
            webView.underPageBackgroundColor = .black
        }
        #if DEBUG
        if #available(macOS 13.3, *) {
            webView.isInspectable = true
        }
        #endif

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Crystal Command"
        window.minSize = NSSize(width: 1024, height: 640)
        window.backgroundColor = .black
        window.collectionBehavior.insert(.fullScreenPrimary)
        window.contentView = webView
        window.setFrameAutosaveName("CrystalCommandMain")
        window.center()
        window.makeKeyAndOrderFront(nil)
    }

    private func loadGame() {
        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "game") else {
            let alert = NSAlert()
            alert.messageText = "Game files missing"
            alert.informativeText = "The app bundle has no Resources/game folder. Rebuild — the Bundle Game Files phase syncs it."
            alert.runModal()
            NSApp.terminate(nil)
            return
        }
        webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    // The game is fully offline; the only permitted navigation is its own
    // file: URL inside the bundle. Anything else is refused.
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.request.url?.isFileURL == true ? .allow : .cancel)
    }

    #if DEBUG
    // Load-failure diagnostics surfaced in the window title. Verified 2026-07-22
    // via a temporary smoke test: skirmish sim, sprites, all 18 sfx slots, and
    // localStorage persistence across relaunch all work inside the sandboxed
    // wrapper (title read "launch:2 units:16 sprites:true sfx:18").
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("typeof CC === 'object' ? 'ready' : 'loaded, game absent'") { result, _ in
            if let status = result as? String, status != "ready" {
                self.window.title = "Crystal Command — \(status)"
            }
        }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        window.title = "Crystal Command — provisional fail: \(error.localizedDescription)"
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        window.title = "Crystal Command — nav fail: \(error.localizedDescription)"
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        window.title = "Crystal Command — WebContent crashed"
    }
    #endif

    // MARK: - Menu bar

    private func buildMenuBar() {
        let mainMenu = NSMenu()

        // App menu
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appItem.submenu = appMenu
        appMenu.addItem(withTitle: "About Crystal Command",
                        action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide Crystal Command",
                        action: #selector(NSApplication.hide(_:)),
                        keyEquivalent: "h")
        let hideOthers = appMenu.addItem(withTitle: "Hide Others",
                                         action: #selector(NSApplication.hideOtherApplications(_:)),
                                         keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(withTitle: "Show All",
                        action: #selector(NSApplication.unhideAllApplications(_:)),
                        keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Crystal Command",
                        action: #selector(NSApplication.terminate(_:)),
                        keyEquivalent: "q")

        // Game menu — native entry points into the game's own UI
        let gameItem = NSMenuItem()
        mainMenu.addItem(gameItem)
        let gameMenu = NSMenu(title: "Game")
        gameItem.submenu = gameMenu
        // ⌘-based equivalents only — the game itself owns bare P and M keys
        gameMenu.addItem(withTitle: "Pause / Resume",
                         action: #selector(togglePauseFromMenu),
                         keyEquivalent: "p")
        let mute = gameMenu.addItem(withTitle: "Toggle Sound",
                                    action: #selector(toggleMuteFromMenu),
                                    keyEquivalent: "m")
        mute.keyEquivalentModifierMask = [.command, .shift]

        // View menu — fullscreen lives here, standard binding ⌃⌘F
        let viewItem = NSMenuItem()
        mainMenu.addItem(viewItem)
        let viewMenu = NSMenu(title: "View")
        viewItem.submenu = viewMenu
        let fullScreen = viewMenu.addItem(withTitle: "Enter Full Screen",
                                          action: #selector(NSWindow.toggleFullScreen(_:)),
                                          keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.control, .command]

        // Window menu
        let windowItem = NSMenuItem()
        mainMenu.addItem(windowItem)
        let windowMenu = NSMenu(title: "Window")
        windowItem.submenu = windowMenu
        windowMenu.addItem(withTitle: "Minimize",
                           action: #selector(NSWindow.miniaturize(_:)),
                           keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Zoom",
                           action: #selector(NSWindow.zoom(_:)),
                           keyEquivalent: "")
        NSApp.windowsMenu = windowMenu

        // Help menu — opens the game's own controls modal, not a web page
        let helpItem = NSMenuItem()
        mainMenu.addItem(helpItem)
        let helpMenu = NSMenu(title: "Help")
        helpItem.submenu = helpMenu
        helpMenu.addItem(withTitle: "Game Controls",
                         action: #selector(showControlsFromMenu),
                         keyEquivalent: "?")
        NSApp.helpMenu = helpMenu

        NSApp.mainMenu = mainMenu
    }

    // MARK: - Menu actions bridged into the game

    @objc private func togglePauseFromMenu() {
        webView.evaluateJavaScript("typeof togglePause === 'function' && togglePause()")
    }

    @objc private func toggleMuteFromMenu() {
        webView.evaluateJavaScript("document.getElementById('btn-mute')?.click()")
    }

    @objc private func showControlsFromMenu() {
        webView.evaluateJavaScript("typeof setHelp === 'function' && setHelp(true)")
    }
}
