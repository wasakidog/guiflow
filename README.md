# guiflow - a text editor for ui flows diagram

## Current Electron Build

This checkout uses Electron 44.2.0. Build with Node.js 22.12 or newer
(tested with Node 24.11.0 and npm 11.6.1). The original UIFlow syntax is retained.

Run in this directory:

```sh
npm ci
npm test
npm start
```

`npm run test:electron` runs a hidden Electron regression test for live edits,
newlines, recovery from invalid syntax, and cancel/discard of unsaved changes.
Dialog responses are simulated in this test; no user documents are touched.

On PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
The first `npm start` may download the Electron development binary.

```sh
npm run package:win32
npm run package:linux
# Or generate both x64 targets:
npm run package:all
```

Outputs are `package/guiflow-win32-x64/guiflow.exe` and
`package/guiflow-linux-x64/guiflow`. Distribute the **whole target folder**,
not the executable alone. Builds are unsigned, unpacked applications, not
installers. `npm run build` builds the host platform (x64); macOS is not tested.
Build commands replace the corresponding generated target directory.

Linux requires a graphical desktop (or WSLg) and Electron's shared libraries.
On the tested Ubuntu 24.04 WSL installation, `libnss3`, `libnspr4` and
`libasound2t64` were missing and had to be installed by an administrator.
Do not disable Chromium's sandbox to work around a system configuration issue.
When transferring a Linux folder from Windows, preserve executable permissions
or restore them for `guiflow` and the supplied helper executables.

The UI runs without Node integration, with context isolation and sandboxing.
File dialogs and clipboard operations use a restricted preload API. No CDN is
required to display the editor. The lockfile fixes the install dependency tree.
The legacy `uiflow` parser dependency still reports obsolete package/engine
warnings, but diagram rendering now uses `@viz-js/viz`.

For a noninteractive smoke test, set `GUIFLOW_SMOKE_DIR` to an absolute,
disposable test directory and run the packaged executable with `--smoke-test`.
It writes `roundtrip.txt` and `window.png`, checks rendering, IPC isolation,
file round trip and Undo, and exits with code 0 on success. Do not point it at
an existing document directory.

The download link below refers to the historical release, not this build.

![test.gif](https://qiita-image-store.s3.amazonaws.com/0/35671/708be4dc-d96a-5f82-6d9d-61cdd5b941eb.gif "test.gif")


# download

[ver0.1.1](https://github.com/hirokidaichi/guiflow/releases/tag/v_0.1.1)

# see

[もう保守されない画面遷移図は嫌なので、UI Flow図を簡単にマークダウンぽく書くエディタ作った](http://qiita.com/hirokidaichi/items/ff54a968bdd7bcc50d42)


