# 家用 KTV：電視播放 + 手機點歌

## 架構
- **伺服器**（家裡任一台電腦 / NAS / TV 盒 Termux）：管理點歌佇列、搜尋 YouTube
- **電視**：瀏覽器開 `tv.html`，全螢幕播放 YouTube KTV 影片
- **手機**：掃電視上的 QR Code → 搜尋、點歌、插播、切歌、音量、收藏

## 最快的方式
- **Windows**：先安裝 Node.js（https://nodejs.org ，選 LTS），再雙擊 `start.bat`
- **macOS / Linux**：在終端機執行 `./start.sh`

第一次會自動安裝套件、建立 `.env`。想用搜尋功能再把金鑰填進 `.env`。

## 安裝（約 10 分鐘）
1. 安裝 Node.js 18 以上：https://nodejs.org
2. 在這個資料夾執行：`npm install`
3. 申請 YouTube API 金鑰（免費）：
   Google Cloud Console → 建立專案 → 啟用「YouTube Data API v3」→ 憑證 → 建立 API 金鑰
4. 把 `.env.example` 複製成 `.env`，填入 `YT_API_KEY=你的金鑰`
5. 執行 `npm start`，終端機會顯示電視和手機的網址

> 沒有金鑰也能用：在手機貼 YouTube 連結點歌，只是不能直接搜尋。
> 免費配額：每天約 100 次搜尋；同一個關鍵字 30 分鐘內重搜不會扣配額。

## 電視端
| 方式 | 做法 |
|---|---|
| Android TV 盒 | 安裝 TV Bro 等 TV 瀏覽器 → 開 `http://伺服器IP:3000/tv.html` → 按 OK 開始 |
| 筆電 / 迷你電腦接 HDMI | Chrome 開 `tv.html` → 點「開始」（會自動全螢幕） |

遙控器：OK 鍵 = 暫停/播放；方向鍵 = 顯示點歌條；快轉鍵 = 切歌。

## 伺服器放哪裡
| 位置 | 備註 |
|---|---|
| 家裡常開的電腦 | 最簡單 |
| NAS（支援 Node.js 或 Docker） | 24 小時開著，最方便 |
| Android TV 盒本身（Termux：`pkg install nodejs`） | 一台搞定，但 TV 盒效能和記憶體要夠 |

## 常見問題
- **手機掃 QR Code 連不上**：手機和伺服器要在同一個 Wi-Fi；Windows 防火牆要允許 Node.js 使用私人網路。
- **某些歌顯示「不允許嵌入播放」並自動跳過**：這是影片擁有者（多半是唱片公司官方頻道）在 YouTube 上的設定，無法繞過。系統會記住這些影片（存在 `blocked.json`），之後搜尋自動排除、再點會直接提醒。請改搜「伴唱」「導唱」，或選其他 KTV 頻道上傳的版本。
- **歌曲之間有廣告**：嵌入播放器的廣告由 YouTube 決定。
- **聲音延遲**：麥克風請走硬體混音器 / K歌擴大機，不要經過這個網頁。

## 使用限制
僅播放 YouTube 嵌入影片，不下載、不擷取音訊，限家庭自用。
