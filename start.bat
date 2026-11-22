@echo off
cd /d "%~dp0"
echo GoodPlay Prototyp: http://localhost:8773
start "" http://localhost:8773
python -m http.server 8773
