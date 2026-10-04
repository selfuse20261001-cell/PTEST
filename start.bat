@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 找不到 Node.js，請先到 https://nodejs.org 安裝 LTS 版，裝完再雙擊這個檔案。
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo 第一次執行，正在安裝套件（約 1 分鐘）...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo 安裝失敗，請把上面的錯誤訊息截圖。 & pause & exit /b 1 )
)
if not exist .env copy .env.example .env >nul
call npm start
pause
