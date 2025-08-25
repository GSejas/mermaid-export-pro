import * as vscode from 'vscode';

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Get a webview URI for a resource in the extension
 */
export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]): vscode.Uri {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

/**
 * Get webview HTML content with proper CSP and resource loading
 */
export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  scriptPath: string[],
  title: string,
  bodyContent: string,
  additionalScripts?: string
): string {
  const scriptUri = getUri(webview, extensionUri, scriptPath);
  const nonce = getNonce();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; font-src ${webview.cspSource} data:; img-src ${webview.cspSource} data:;">
  <title>${title}</title>
</head>
<body>
  ${bodyContent}
  
  <script type="text/javascript" nonce="${nonce}" src="${scriptUri}"></script>
  ${additionalScripts ? `<script nonce="${nonce}">${additionalScripts}</script>` : ''}
</body>
</html>`;
}