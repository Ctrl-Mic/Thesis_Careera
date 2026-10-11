@echo off
setlocal

set "ROOT=%~dp0"
set "APP=%ROOT%thesis-system"
set "INSIGHT=%APP%\backend\insightface_api"
set "PYTHON=%INSIGHT%\.venv\Scripts\python.exe"

if not exist "%APP%\.env.local" (
  echo Missing configuration file: "%APP%\.env.local"
  echo Create it using the setup instructions in README.md.
  goto failed
)

if not exist "%APP%\node_modules\.bin\vite.cmd" goto install_node_dependencies
if not exist "%APP%\node_modules\prisma\build\index.js" goto install_node_dependencies
if not exist "%APP%\node_modules\@prisma\client\package.json" goto install_node_dependencies
goto prepare_prisma

:install_node_dependencies
echo Installing Node.js dependencies...
pushd "%APP%"
call npm install
if errorlevel 1 goto node_install_failed
popd

:prepare_prisma
pushd "%APP%"
if not exist "%APP%\node_modules\.prisma\client\index.js" goto generate_prisma
node -e "const fs=require('node:fs');process.exit(fs.statSync('prisma/schema.prisma').mtimeMs > fs.statSync('node_modules/.prisma/client/index.js').mtimeMs ? 1 : 0)"
if errorlevel 1 goto generate_prisma
goto apply_migrations

:generate_prisma
echo Generating Prisma Client because it is missing or the schema changed...
call npx prisma generate
if errorlevel 1 goto prisma_generate_failed

:apply_migrations
if /I "%~1"=="--migrate" (
  echo Applying pending Prisma migrations...
  call npx prisma migrate deploy
  if errorlevel 1 goto migration_failed
)
popd

if exist "%PYTHON%" goto verify_python
where py >nul 2>&1
if errorlevel 1 goto python_launcher_missing

py -3.11 --version >nul 2>&1
if not errorlevel 1 goto create_python_311
py -3.10 --version >nul 2>&1
if not errorlevel 1 goto create_python_310
goto supported_python_missing

:create_python_311
echo Creating the InsightFace environment with Python 3.11...
py -3.11 -m venv "%INSIGHT%\.venv"
if errorlevel 1 goto python_environment_failed
goto verify_python

:create_python_310
echo Creating the InsightFace environment with Python 3.10...
py -3.10 -m venv "%INSIGHT%\.venv"
if errorlevel 1 goto python_environment_failed

:verify_python
"%PYTHON%" -c "import sys; sys.exit(0 if sys.version_info[:2] in ((3, 10), (3, 11)) else 1)"
if errorlevel 1 goto unsupported_venv

echo Installing or verifying InsightFace dependencies...
"%PYTHON%" -m pip install -r "%INSIGHT%\requirements.txt"
if errorlevel 1 goto python_dependencies_failed

echo Checking whether the InsightFace API is already running...
"%PYTHON%" -c "import socket,sys; s=socket.socket(); c=s.connect_ex(('127.0.0.1',8000)); s.close(); sys.exit(0 if c == 0 else 1)" >nul 2>&1
if errorlevel 1 goto start_services
"%PYTHON%" -c "import json,sys,urllib.request; d=json.load(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5)); sys.exit(0 if d.get('status') == 'ok' and d.get('ready') is True else 1)" >nul 2>&1
if errorlevel 1 goto insightface_port_conflict
set "INSIGHTFACE_ALREADY_RUNNING=1"

:start_services
echo Starting each service in its own console window.
start "Careera Frontend" cmd.exe /k "cd /d ""%APP%"" && npm run dev"
start "Careera Backend" cmd.exe /k "cd /d ""%APP%"" && npm run server"
if defined INSIGHTFACE_ALREADY_RUNNING goto insightface_already_running
start "Careera InsightFace" cmd.exe /k "cd /d ""%INSIGHT%"" && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000"
goto startup_complete

:insightface_already_running
echo InsightFace API is already healthy on port 8000; skipping the duplicate process.

:startup_complete
exit /b 0

:node_install_failed
popd
echo Node.js dependency installation failed. Services were not started.
goto failed

:prisma_generate_failed
popd
echo Prisma Client generation failed. Services were not started.
echo If another backend is running, stop it and rerun this launcher.
goto failed

:migration_failed
popd
echo Prisma migration failed. Services were not started.
goto failed

:python_launcher_missing
echo The Windows Python launcher "py" is required to create the InsightFace environment.
goto failed

:supported_python_missing
echo Python 3.10 or 3.11 is required for the InsightFace service.
goto failed

:python_environment_failed
echo Could not create the InsightFace virtual environment.
goto failed

:unsupported_venv
echo The existing InsightFace virtual environment must use Python 3.10 or 3.11.
echo Remove "%INSIGHT%\.venv" and run this launcher again to recreate it.
goto failed

:python_dependencies_failed
echo InsightFace dependency installation failed. Services were not started.
goto failed

:insightface_port_conflict
echo Port 8000 is already in use, but the InsightFace health check failed.
echo Stop the conflicting process or wait for the InsightFace API to finish loading, then rerun this launcher.
goto failed

:failed
echo.
pause
exit /b 1
