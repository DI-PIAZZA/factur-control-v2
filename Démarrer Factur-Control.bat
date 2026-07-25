@echo off
title Factur-Control — Démarrage
cd /d "%~dp0"
echo.
echo  ================================================
echo   FACTUR-CONTROL — Lancement du serveur local
echo  ================================================
echo.
echo  Ouverture dans le navigateur dans quelques secondes...
echo.
start "" http://localhost:3000
npm run dev
pause
