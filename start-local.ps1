# EPIX Local Server Startup Script
# Run this to start everything locally with tunnel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EPIX Esports - Local Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check MongoDB
Write-Host "[1/4] Checking MongoDB..." -ForegroundColor Yellow
$mongoStatus = (Get-Service MongoDB).Status
if ($mongoStatus -ne "Running") {
    Write-Host "  Starting MongoDB..." -ForegroundColor Gray
    Start-Service MongoDB
    Start-Sleep -Seconds 3
}
Write-Host "  MongoDB: Running on D:\epix-data\db\" -ForegroundColor Green

# Start Backend
Write-Host "[2/4] Starting Backend (port 5000)..." -ForegroundColor Yellow
$backendPath = "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run dev" -WindowStyle Minimized
Write-Host "  Backend started" -ForegroundColor Green

# Start Frontend
Write-Host "[3/4] Starting Frontend (port 3000)..." -ForegroundColor Yellow
$frontendPath = "D:\Projects\Default Project\pubg-tournaments\PUBG-Tournaments-Hosting-master\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Minimized
Write-Host "  Frontend started" -ForegroundColor Green

# Start Cloudflare Tunnel
Write-Host "[4/4] Starting Cloudflare Tunnel..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel run epix" -WindowStyle Minimized
Start-Sleep -Seconds 3
Write-Host "  Tunnel started" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All services running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Local URLs:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "  Backend:  http://localhost:5000/api" -ForegroundColor Gray
Write-Host ""
Write-Host "Public URLs (after DNS update):" -ForegroundColor White
Write-Host "  Website:  https://www.epixesports.com" -ForegroundColor Gray
Write-Host "  API:      https://api.epixesports.com/api" -ForegroundColor Gray
Write-Host ""
Write-Host "Images save to: D:\epix-images\" -ForegroundColor Gray
Write-Host "Database on:    D:\epix-data\db\" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor DarkGray
Read-Host
