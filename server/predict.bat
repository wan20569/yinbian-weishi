@echo off
chcp 65001 >nul
cd /d "%~dp0.."

if "%~1"=="" (
    echo Drag an audio file or folder onto this .bat, or run:
    echo     server\predict.bat "D:\music\song.mp3"
    pause
    exit /b 1
)

if "%~2"=="" (
    ".venv-infer\Scripts\python.exe" "server\infer.py" "%~1"
) else (
    ".venv-infer\Scripts\python.exe" "server\infer.py" %*
)
echo.
pause
