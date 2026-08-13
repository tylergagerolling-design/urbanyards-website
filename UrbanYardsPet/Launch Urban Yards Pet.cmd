@echo off
setlocal
cd /d "%~dp0"
where pwsh.exe >nul 2>nul
if %errorlevel%==0 (
  start "" pwsh.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Start-UrbanYardsPet.ps1"
) else (
  start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0Start-UrbanYardsPet.ps1"
)
endlocal
