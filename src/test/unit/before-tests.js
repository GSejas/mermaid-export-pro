// Minimal runtime mock for 'vscode' so unit tests can import it without an extension host.
const mock = require('mock-require');

mock('vscode', {
  window: {
    createStatusBarItem: () => ({ show: () => {}, hide: () => {}, dispose: () => {} }),
    showInformationMessage: () => Promise.resolve(undefined),
    showWarningMessage: () => Promise.resolve(undefined)
  },
  workspace: {
    getConfiguration: () => ({ update: () => {} })
  },
  ExtensionMode: { Production: 1, Development: 2 },
  ConfigurationTarget: { Global: 1 }
});

// Allow tests to require sinon later
require('source-map-support/register');
