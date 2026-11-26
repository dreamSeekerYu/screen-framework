@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Excel To JSON And File Server
rem Keep console output UTF-8 so Node.js Chinese messages display correctly
chcp 65001 >nul

echo ============================================================
echo   Step 1. Pull xlsx from shared folder  -^>  excal\
echo   Step 2. Convert to JSON (data\) + extract images (img\)
echo   Step 3. Start local file server for LAN access
echo.
echo   ** SETUP: edit the SHARE= line below once **
echo ============================================================
echo.

rem ============ CONFIG ============
rem SHARE = source folder (any path, subfolders are scanned too)
rem         or a single .xlsx/.xlsm file path
rem   set "SHARE=\\FILESERVER\public\reports"
rem   set "SHARE=D:\work\excels"
set "SHARE=D:\代码\screen-framework\excal 转换 json"
rem ============ /CONFIG ============

rem You can also pass the share path as argument (overrides SHARE above):
rem   ExcelToJSON-server.bat "\\FILESERVER\public\reports"
rem NOTE: only overrides when an argument is actually given
if not "%~1"=="" set "SHARE=%~1"

rem ---------- check node ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 14+ from https://nodejs.org/
  echo         then put node.exe in PATH, or contact IT.
  pause
  exit /b 1
)
node -v

rem ---------- [1/3] pull xlsx from shared folder ----------
rem NOTE: SHARE is only expanded with delayed expansion !SHARE! so that
rem       paths containing ) or & can never break the script parsing.
rem All key events are appended to run_log.txt for troubleshooting.
echo [%date% %time%] ==== run start, SHARE=!SHARE! ==== >> run_log.txt
set "MODE="
if defined SHARE (
  set "EXT5=!SHARE:~-5!"
  if /i "!EXT5!"==".xlsx" set "MODE=file"
  if /i "!EXT5!"==".xlsm" set "MODE=file"
  if not defined MODE set "MODE=folder"
)

if not defined SHARE (
  echo [1/3] SHARE is empty - skip pulling. Using existing excal folder.
  echo [%date% %time%] SHARE empty, skip pulling >> run_log.txt
  goto pulldone
)

echo [1/3] Pulling xlsx from: !SHARE!
rem Clear excal first for a FRESH pull (old pulled files are removed)
if exist excal rd /s /q excal
mkdir excal
echo [%date% %time%] excal cleared for fresh pull >> run_log.txt

if "%MODE%"=="file" copy /y "!SHARE!" excal\ >nul
if "%MODE%"=="file" if errorlevel 1 (
  echo [ERROR] Cannot access file.
  echo         Check the path / permissions, then retry.
  echo [%date% %time%] ERROR copy failed: !SHARE! >> run_log.txt
  pause
  exit /b 1
)
if "%MODE%"=="file" (
  echo       Done. File copied to excal
  echo [%date% %time%] file copied OK >> run_log.txt
)

if "%MODE%"=="folder" robocopy "!SHARE!" excal *.xlsx *.xlsm /E /NFL /NDL /NJH /NJS /NP >nul
if "%MODE%"=="folder" if errorlevel 8 (
  echo [ERROR] Cannot access shared folder.
  echo         Check the path / network / permissions, then retry.
  echo [%date% %time%] ERROR robocopy failed, code=!errorlevel! SHARE=!SHARE! >> run_log.txt
  pause
  exit /b 1
)
if "%MODE%"=="folder" (
  echo       Done. Files now in excal ^(subfolders kept, all scanned^)
  echo [%date% %time%] robocopy OK, code=!errorlevel! >> run_log.txt
)

:pulldone
echo.

rem ---------- [2/3] convert ----------
echo [2/3] Converting Excel to JSON + extracting images ...
rem .cjs extension: force CommonJS mode, immune to any package.json "type":"module"
node convert.cjs excal data img
if errorlevel 1 (
  echo [ERROR] Conversion finished with errors, see messages above.
  echo         Full details were saved to run_log.txt - send it to your helper.
)
echo [%date% %time%] convert exit code=!errorlevel! >> run_log.txt
echo.

rem ---------- [3/3] file server ----------
echo [3/3] Starting file server on port 8080 ...
echo [%date% %time%] starting file server on 8080 >> run_log.txt
node server.cjs 8080
pause
