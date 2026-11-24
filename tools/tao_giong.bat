@echo off
cd /d "%~dp0.."
node tools\list_phrases.js
python tools\gen_voice.py
pause
