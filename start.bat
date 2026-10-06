@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem 家用 KTV（PiKaraoke 台灣版）：雙擊這個檔案啟動

where winget >nul 2>nul
if errorlevel 1 (
  echo 找不到 winget，請先到 Microsoft Store 更新「應用程式安裝程式」。
  pause
  exit /b 1
)

where uv >nul 2>nul
if errorlevel 1 (
  echo 第一次執行：安裝 uv（Python 管理工具）...
  powershell -NoProfile -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  set "PATH=%USERPROFILE%\.local\bin;%PATH%"
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo 第一次執行：安裝 FFmpeg（影音轉檔）...
  winget install --id=Gyan.FFmpeg -e --silent --accept-source-agreements --accept-package-agreements
  set NEED_RESTART=1
)

where node >nul 2>nul
if errorlevel 1 (
  where deno >nul 2>nul
  if errorlevel 1 (
    echo 第一次執行：安裝 Deno（YouTube 下載需要）...
    winget install --id=DenoLand.Deno -e --silent --accept-source-agreements --accept-package-agreements
    set NEED_RESTART=1
  )
)

if defined NEED_RESTART (
  echo.
  echo 安裝完成！請關閉這個視窗，再雙擊一次 start.bat。
  pause
  exit /b 0
)

uv run pikaraoke %*
if errorlevel 1 (
  echo 啟動失敗，請把上面的錯誤訊息截圖。
  pause
)
