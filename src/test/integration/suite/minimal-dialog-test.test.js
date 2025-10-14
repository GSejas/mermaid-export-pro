"use strict";
/**
 * Minimal test to verify _testExport works without dialogs
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) {if (Object.prototype.hasOwnProperty.call(o, k)) {ar[ar.length] = k;}}
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) {return mod;}
        var result = {};
        if (mod !== null) {for (var k = ownKeys(mod), i = 0; i < k.length; i++) {if (k[i] !== "default") {__createBinding(result, mod, k[i]);}}}
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const vscode_helpers_1 = require("../helpers/vscode-helpers");
const fixture_manager_1 = require("../helpers/fixture-manager");
const extension_setup_1 = require("../helpers/extension-setup");
suite.only('Minimal Dialog Test', () => {
    let vscodeHelper;
    let fixtureManager;
    suiteSetup(async function () {
        this.timeout(30000);
        await extension_setup_1.ExtensionSetup.ensureActivated();
    });
    setup(() => {
        fixtureManager = new fixture_manager_1.FixtureManager();
        vscodeHelper = new vscode_helpers_1.VSCodeTestHelper();
    });
    teardown(async () => {
        await fixtureManager.cleanup();
        await vscodeHelper.closeAllEditors();
    });
    test('should export SVG without showing any dialogs', async function () {
        this.timeout(20000);
        console.log('\n=== STARTING MINIMAL TEST ===');
        // Create test workspace with one diagram
        const workspaceDir = await fixtureManager.createTestWorkspace('minimal-test', []);
        const diagramPath = await fixtureManager.createMermaidFile(workspaceDir, 'test.mmd', 'graph TD\n  A[Start] --> B[End]');
        console.log('[TEST] Created diagram at:', diagramPath);
        // Open the file in editor
        const editor = await vscodeHelper.openFile(diagramPath);
        assert.ok(editor, 'Failed to open diagram file');
        console.log('[TEST] File opened in editor');
        // Define expected output path
        const outputPath = diagramPath.replace('.mmd', '.svg');
        console.log('[TEST] Expected output path:', outputPath);
        // Execute TEST command with explicit output path (NO DIALOGS!)
        console.log('[TEST] Executing _testExport command...');
        await vscodeHelper.executeCommand('mermaidExportPro._testExport', undefined, outputPath);
        // Wait for export to complete
        console.log('[TEST] Waiting for export to complete...');
        await vscodeHelper.sleep(8000);
        // Verify SVG file was created
        console.log('[TEST] Checking if file exists...');
        const exists = fs.existsSync(outputPath);
        assert.ok(exists, `Expected SVG output at ${outputPath}`);
        // Verify it's a valid SVG (basic check)
        const content = fs.readFileSync(outputPath, 'utf8');
        assert.ok(content.includes('<svg'), 'Output should be valid SVG');
        assert.ok(content.includes('</svg>'), 'Output should be valid SVG');
        console.log('[TEST] ✅ Test passed! File created without dialogs.');
        console.log('=== TEST COMPLETE ===\n');
    });
});
//# sourceMappingURL=minimal-dialog-test.test.js.map