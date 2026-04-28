@echo off
set GeminiPrompt=%1
echo %GeminiPrompt% | gemini -p "%GeminiPrompt%" -y