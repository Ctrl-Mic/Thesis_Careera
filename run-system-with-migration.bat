@echo off
call "%~dp0run-system.bat" --migrate
exit /b %errorlevel%
