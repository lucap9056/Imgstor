English | [繁體中文](README.zh-TW.md)

<div align="center">
	<img src="./public/favicon.ico" width="128" height="128" alt="Imgstor Logo">
	<h1>Imgstor</h1>
	<p><strong>A personal manager for images published across multiple hosting services, backed up to your own Google Drive</strong></p>
</div>

---

## Overview

Imgstor helps you upload, organize, and publish images to the hosting services you already use (Imgur, SM.MS, Catbox), while keeping a searchable, tagged library of everything. Google Drive is used as the backup layer for that library — your original images, metadata, and settings are saved to your own Drive, never to a server Imgstor operates.

## Core Philosophy

### Your Drive, Your Data
Imgstor is a client-side application. It has no backend or database of its own; it only acts on your behalf against the hosting services and the Google Drive account you connect.

*   **No Server Storage**: Images and settings go directly to the hosting service you choose and to your own Google Drive — never through a server Imgstor operates.
*   **Hidden, Isolated Backup**: Backups live in Drive's `appDataFolder` — invisible in your regular file list and inaccessible to other apps.
*   **You Hold the Keys**: Revoking Imgstor's Google account access at any time immediately cuts off all further access to your data.

---

## Key Features

*   **Multi-Service Publishing**: Upload images directly to Imgur, SM.MS, or Catbox — all from one interface.
*   **Google Drive Backup**: Original images and settings are automatically and securely backed up to a dedicated `appDataFolder` in your Drive.
*   **Reupload & Original-File Downloads**: Since the original file is kept in your Drive, you can reupload it to a hosting service at any time, and downloads always return that original file — never a copy fetched from (and possibly recompressed by) the external service.
*   **Tagging System**: Attach custom tags to images for easy categorization, searching, and management.
*   **Format Conversion**: Basic image format conversion built in; for advanced needs, a dedicated external tool is recommended.
*   **Local Index Database**: A local SQLite (WebAssembly) database indexes your images for fast searching, and is itself backed up to Drive.

---

## Technology Stack

*   **Frontend**: React, React Router, Sass
*   **Local Database**: sql.js (SQLite compiled to WebAssembly)
*   **Image Processing**: Rust (WebAssembly), ffmpeg.wasm
*   **Backup Storage**: Google Drive API
*   **Development**: Bun, Biome, TypeScript, Vite

---

## Getting Started

### Use It Online

1.  Visit the [Imgstor](https://lucap9056.github.io/Imgstor/) website.
2.  Click "Sign in with Google" and complete the authorization process (used for Drive backup).
3.  Start uploading and publishing your images!

### Local Development

Ensure you have **Bun** and the **Rust** toolchain (with the `wasm32-unknown-unknown` target and `wasm-pack`) installed, then run:

```bash
bun install
bun dev
```
