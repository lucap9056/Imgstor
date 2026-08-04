[English](README.md) | 繁體中文

<div align="center">
	<img src="./public/favicon.ico" width="128" height="128" alt="Imgstor Logo">
	<h1>Imgstor</h1>
	<p><strong>管理發佈至多個圖片託管服務的圖片，並備份至您自己的 Google Drive</strong></p>
</div>

---

## 概述

Imgstor 幫助您將圖片上傳、整理並發佈到您慣用的圖片託管服務（Imgur、SM.MS、Catbox），同時維護一份可搜尋、可標籤的圖片庫。Google Drive 則作為這份圖片庫的備份層——您的原始圖片、中繼資料與設定都會儲存到您自己的 Drive，而不會經過 Imgstor 所營運的任何伺服器。

## 核心理念

### 您的 Drive，您的資料
Imgstor 是一個純前端應用程式，本身沒有任何後端或資料庫，僅代表您對所連接的圖片託管服務與 Google Drive 帳戶執行操作。

*   **不經伺服器儲存**：圖片與設定會直接送往您選擇的圖片託管服務，以及您自己的 Google Drive——不會經過 Imgstor 所營運的任何伺服器。
*   **隱藏且獨立的備份**：備份資料存放在 Drive 的 `appDataFolder` 中——在您一般的檔案列表中不可見，其他應用程式也無法存取。
*   **金鑰由您掌握**：只要您隨時撤銷 Imgstor 的 Google 帳戶存取權限，便能立即中斷其對您資料的所有存取。

---

## 主要功能

*   **多服務發佈**：可直接將圖片上傳至 Imgur、SM.MS、Catbox——全部整合在同一介面中操作。
*   **Google Drive 備份**：原始圖片與設定會自動安全地備份至 Drive 中專屬的 `appDataFolder`。
*   **重新上傳與原始檔下載**：由於原始檔案保存在您的 Drive 中，您可以隨時將其重新上傳至圖片託管服務；下載時取得的也永遠是這份原始檔案，而不是從外部服務取回（可能已被重新壓縮）的版本。
*   **標籤系統**：為圖片附加自訂標籤，方便分類、搜尋與管理。
*   **格式轉換**：內建基本的圖片格式轉換功能；若有進階需求，建議使用專業的外部工具。
*   **本機索引資料庫**：本機的 SQLite（WebAssembly）資料庫用於快速索引與搜尋圖片，該資料庫本身也會備份至 Drive。

---

## 技術棧

*   **前端**：React, React Router, Sass
*   **本機資料庫**：sql.js（編譯為 WebAssembly 的 SQLite）
*   **圖片處理**：Rust（WebAssembly）、ffmpeg.wasm
*   **備份儲存**：Google Drive API
*   **開發工具**：Bun, Biome, TypeScript, Vite

---

## 開始使用

### 線上使用

1.  造訪 [Imgstor](https://lucap9056.github.io/Imgstor/) 網站。
2.  點擊「使用 Google 帳戶登入」並完成授權（用於 Drive 備份）。
3.  開始上傳、發佈您的圖片！

### 本地開發

請確保已安裝 **Bun** 以及 **Rust** 工具鏈（含 `wasm32-unknown-unknown` target 與 `wasm-pack`），然後執行：

```bash
bun install
bun dev
```
