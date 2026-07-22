import Cocoa

// Programmatic AppKit entry — no storyboard, no nib. The delegate builds the
// menu bar and window itself so the whole wrapper stays reviewable in one file.
let delegate = AppDelegate()
NSApplication.shared.delegate = delegate
_ = NSApplicationMain(CommandLine.argc, CommandLine.unsafeArgv)
