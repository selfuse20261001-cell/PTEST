@echo off
chcp 65001 >nul
rem 讓手機可以連到這台電腦的 KTV 伺服器：開放防火牆的 KTV 連接埠（預設 3000）
net session >nul 2>&1
if errorlevel 1 goto elevate
cd /d "%~dp0"

set KTV_PORT=3000
if exist .env for /f "tokens=1,* delims==" %%a in ('findstr /b "PORT=" .env') do if not "%%b"=="" set KTV_PORT=%%b

echo.
echo 正在開放防火牆連接埠 %KTV_PORT% ...
netsh advfirewall firewall delete rule name="Home KTV" >nul 2>&1
netsh advfirewall firewall add rule name="Home KTV" dir=in action=allow protocol=TCP localport=%KTV_PORT% profile=any >nul
if errorlevel 1 goto failed
echo 完成！不管 Wi-Fi 是「私人」或「公用」網路，手機都可以連進來了。
echo.
echo 目前的網路：
powershell -NoProfile -Command "Get-NetConnectionProfile | Format-Table -AutoSize InterfaceAlias,Name,NetworkCategory"
echo 請重新雙擊 start.bat，再用手機掃一次 QR Code。
echo 不再使用時，可在「Windows Defender 防火牆 - 進階設定 - 輸入規則」刪除「Home KTV」。
pause
exit /b 0

:failed
echo 設定失敗，請把這個畫面截圖。
pause
exit /b 1

:elevate
echo 需要系統管理員權限，請在跳出的視窗按「是」。
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b 0
