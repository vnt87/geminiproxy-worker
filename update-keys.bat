@echo off
setlocal enabledelayedexpansion

:: Check for required files
if not exist "wrangler.toml" (
    if exist "wrangler.toml.example" (
        copy /y wrangler.toml.example wrangler.toml >nul
        echo Copied wrangler.toml.example to wrangler.toml
        echo Please edit wrangler.toml with your KV namespace ID
        exit /b 1
    ) else (
        echo Error: wrangler.toml not found and no example file available
        exit /b 1
    )
)

if not exist "gemini-keys.json" (
    if exist "gemini-keys.json.example" (
        copy /y gemini-keys.json.example gemini-keys.json >nul
        echo Copied gemini-keys.json.example to gemini-keys.json
        echo Please add your Gemini API keys to gemini-keys.json
        exit /b 1
    ) else (
        echo Error: gemini-keys.json not found and no example file available
        exit /b 1
    )
)

:: Validate JSON
jq empty gemini-keys.json >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: gemini-keys.json contains invalid JSON
    exit /b 1
)

:: Execute Wrangler command directly with the file
wrangler kv:bulk put --binding=GEMINI_KEYS "gemini-keys.json"
