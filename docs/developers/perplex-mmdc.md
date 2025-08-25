```
{
  "messages": [
    {
      "role": "user",
      "content": "Provide a concise but complete reference of the `mmdc` (mermaid-cli) functionality and options. Cover:\n\n- All common CLI flags (input/output, theme, width/height, background, cssFile, configFile, pdf flags, scale, puppeteer options, timeout, puppeteer executable path, etc.)\n- Input modes: file, stdin, markdown-transform mode (transform markdown files with embedded mermaid blocks)\n- Output formats supported (svg, png, pdf, webp, etc.) and quality/scale options\n- Programmatic API (import { run } from '@mermaid-js/mermaid-cli') usage and options differences vs CLI\n- Docker usage and recommended mount/workdir flags\n- Environment variables and Puppeteer overrides (PUPPETEER_EXECUTABLE_PATH, PUPPETEER_ARGS) and common troubleshooting tips (Chromium spawn errors, sandboxing on Linux/Windows)\n- Security considerations when using configFile/themeCSS/cssFile\n- Examples of common commands for: single diagram render, markdown transform, piping via stdin, using custom CSS or config, producing PDF\n- Best practices for integrating mmdc into a VS Code extension (paths, avoid shell:true, error handling, timeouts, fallbacks)\n\nReturn a short reference list and 6 compact example commands (copyable). Keep it practical and precise."
    }
  ]
}
```

**Mermaid CLI (`mmdc`) Reference (2025)**

---

**CLI Usage:**  
`mmdc -i <input> -o <output> [options]`

### Common CLI Flags

- **-i, --input**: Mermaid file (`.mmd`), markdown file (`.md`), or `-` for stdin[2][3].
- **-o, --output**: Output file (ending in .svg, .png, .pdf, .webp)[2][3].
- **--theme**: Diagram theme (`default`, `dark`, `forest`, `neutral`, etc.).
- **--width / --height**: Output image size in px.
- **--backgroundColor [color]**: Set background (e.g., `transparent`, `#fff`).
- **--cssFile <file.css>**: Inject custom CSS.
- **--configFile <file.json>**: mermaid config (JSON).
- **--puppeteerConfigFile**: Puppeteer launch config (JSON).
- **--quality**: PNG/WebP/JPEG quality (`0-100`).
- **--pdfFit**: Fit diagram to PDF page.
- **--scale**: Output scale factor (float, default: `1`).
- **--puppeteerConfigFile**: Path to Puppeteer config JSON.
- **--puppeteerExecutablePath**: Use custom Chromium/Chrome binary.
- **--puppeteerArgs**: Additional Puppeteer arguments.
- **--timeout**: Max rendering time (ms).
- **--verbose**: More logging.
- **--help/-h**: Show full options.

See `mmdc -h` for all flags.

---

### Input Modes

- **File**: `-i input.mmd` or `-i input.md`
- **Stdin**: `-i -` (reads mmd text from standard input)[3]
- **Markdown-transform mode**:  
  Input `.md` files are scanned for Mermaid code blocks, which are replaced by image references (default: output to `<original>.md` or specify output file)[3].

---

### Output Formats & Options

- **SVG**
- **PNG**
- **PDF** (with `--pdfFit` to scale)[2]
- **WebP**, **JPEG** (via file extension)
- **Quality**: `--quality` for PNG/WEBP/JPG
- **Scale**: `--scale` for image/bitmap resolution

---

### Programmatic API

```js
import { run } from "@mermaid-js/mermaid-cli";

await run("input.mmd", "output.svg", {
  theme: "dark",
  width: 720,
  height: 480,
  configFile: "config.json",
  puppeteerConfigFile: "pptr.json",
  // additional options...
});
```
- Arguments map closely to CLI, but the API is **not semver-stable**[2].  
- Options accept JS types directly (numbers, booleans, etc.).  
- Returns a Promise; you must handle errors explicitly.

---

### Docker Usage

- **Recommended run:**  
  ```
  docker run --rm -v "$PWD":/data -w /data minlag/mermaid-cli -i in.mmd -o out.svg
  ```
- **Mount**: Use `-v` to mount local working dir to `/data`
- **Workdir**: Set `--workdir=/data` inside container[2]

---

### Environment Variables & Puppeteer

- **PUPPETEER_EXECUTABLE_PATH**: Path to Chromium/Chrome. Set if default doesn't work.
- **PUPPETEER_ARGS**: Extra Chromium flags (`--no-sandbox` for CI/Linux if sandbox errors appear).
- **Common troubleshooting**:
  - On Linux/CI: Use `--puppeteerConfigFile` or env vars to specify `args: ['--no-sandbox']`
  - *Chromium not found*: Set `PUPPETEER_EXECUTABLE_PATH` or install chromium/chrome.
  - *Timeouts*: Use `--timeout` or increase default (esp. in container/headless).
  - On Windows: Paths with spaces must be quoted.

---

### Security Considerations

- **configFile/themeCSS/cssFile**: Never use untrusted files—arbitrary content can affect rendering and security (CSS injection, potential unsafe JS in config).
- Use safest themes where possible and sanitize any downloaded or network-influenced configs.

---

### Command Examples

```bash
# Render single diagram to SVG
mmdc -i diagram.mmd -o diagram.svg

# Pipe from stdin
echo 'graph TD; A-->B;' | mmdc -i - -o out.png

# Transform markdown file (replace Mermaid blocks with local images)
mmdc -i notes.md -o out.md

# Render using custom CSS and config
mmdc -i d.mmd -o d.png --configFile conf.json --cssFile style.css

# Produce PDF at scale 2x
mmdc -i d.mmd -o d.pdf --scale 2 --pdfFit

# Dockerized rendering (current folder)
docker run --rm -v "$PWD":/data -w /data minlag/mermaid-cli -i foo.mmd -o foo.svg
```

---

### VS Code Extension Integration Tips (Best Practices)

- Reference `mmdc` via absolute path (`node_modules/.bin/mmdc` if local), not global command name, for reliability.
- Use Node.js `child_process.spawn` (not `exec` and **never** with `shell:true`) for launching.
- Always set an explicit timeout and provide error handling for process errors/output.
- Set `PUPPETEER_EXECUTABLE_PATH`/`PUPPETEER_ARGS` env vars for platform compatibility.
- For rendering fallback: handle both exit codes and output stderr for user feedback.
- Avoid writing temp files in user directories without cleanup; use OS temp locations.
- If possible, check for `mmdc` existence on extension activation, warn if not found.

---

**Further info, community-maintained updates, and all CLI flags**: Run `mmdc -h` or consult the [mermaid-cli repository][2][3].

Citations:
[1] https://pkg.go.dev/go.abhg.dev/goldmark/mermaid
[2] https://github.com/mermaid-js/mermaid-cli
[3] https://www.x-cmd.com/pkg/mermaid-cli/
[4] https://playbooks.com/mcp/silver0510-mermaid-diagram-generator
[5] https://forum.snapcraft.io/t/mermaid-cli-alias-request-for-mmdc/47175
