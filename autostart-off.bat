@echo off
rem Disable Windows Startup autostart for AGY Pet (agy-pet).
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = [Environment]::GetFolderPath('Startup'); $hit = $false;" ^
  "foreach ($n in @('AGY-Pet.lnk', 'AGY-Claude-Style.lnk', 'Antigravity Claude Style.lnk')) { $p = Join-Path $s $n; if (Test-Path $p) { Remove-Item $p -Force; Write-Host ('Autostart disabled: ' + $p); $hit = $true } }" ^
  "if (-not $hit) { Write-Host 'AGY Pet (agy-pet) autostart shortcut not found.' }"
pause
