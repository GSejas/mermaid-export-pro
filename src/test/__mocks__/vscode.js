"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDisposable = exports.commands = exports.workspace = exports.window = exports.ThemeColor = exports.ExtensionMode = exports.ConfigurationTarget = exports.StatusBarAlignment = void 0;
// Mock implementation of VS Code API for unit tests
var StatusBarAlignment;
(function (StatusBarAlignment) {
    StatusBarAlignment[StatusBarAlignment["Left"] = 1] = "Left";
    StatusBarAlignment[StatusBarAlignment["Right"] = 2] = "Right";
})(StatusBarAlignment || (exports.StatusBarAlignment = StatusBarAlignment = {}));
var ConfigurationTarget;
(function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["Global"] = 1] = "Global";
    ConfigurationTarget[ConfigurationTarget["Workspace"] = 2] = "Workspace";
    ConfigurationTarget[ConfigurationTarget["WorkspaceFolder"] = 3] = "WorkspaceFolder";
})(ConfigurationTarget || (exports.ConfigurationTarget = ConfigurationTarget = {}));
var ExtensionMode;
(function (ExtensionMode) {
    ExtensionMode[ExtensionMode["Production"] = 1] = "Production";
    ExtensionMode[ExtensionMode["Development"] = 2] = "Development";
    ExtensionMode[ExtensionMode["Test"] = 3] = "Test";
})(ExtensionMode || (exports.ExtensionMode = ExtensionMode = {}));
class ThemeColor {
    id;
    constructor(id) {
        this.id = id;
    }
}
exports.ThemeColor = ThemeColor;
exports.window = {
    createStatusBarItem: (alignment = StatusBarAlignment.Right, priority) => ({
        text: '',
        tooltip: '',
        command: '',
        color: undefined,
        backgroundColor: undefined,
        show: () => { },
        hide: () => { },
        dispose: () => { }
    }),
    showInformationMessage: (message, ...items) => Promise.resolve(items[0]),
    showWarningMessage: (message, ...items) => Promise.resolve(items[0]),
    showQuickPick: (items, options) => Promise.resolve(items[0]),
    createOutputChannel: (name) => ({
        append: () => { },
        show: () => { },
        dispose: () => { }
    }),
    activeTextEditor: undefined
};
exports.workspace = {
    getConfiguration: (section) => ({
        get: (key, defaultValue) => defaultValue,
        update: (key, value, target) => Promise.resolve()
    }),
    onDidChangeTextDocument: () => ({ dispose: () => { } })
};
exports.commands = {
    executeCommand: (command, ...args) => Promise.resolve()
};
// Mock disposable for subscriptions
exports.mockDisposable = { dispose: () => { } };
//# sourceMappingURL=vscode.js.map