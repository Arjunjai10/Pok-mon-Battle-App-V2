Write-Host "--- TEST: signup ---"
curl.exe -s -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\`"userID\`":\`"testuser2\`",\`"password\`":\`"pass123\`"}" -c cookies.txt
Write-Host "`n--- TEST: login ---"
curl.exe -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\`"userID\`":\`"testuser2\`",\`"password\`":\`"pass123\`"}" -c cookies.txt
Write-Host "`n--- TEST: /me (authenticated) ---"
curl.exe -s http://localhost:3000/api/auth/me -b cookies.txt
Write-Host "`n--- TEST: /me (no cookie) ---"
curl.exe -s http://localhost:3000/api/auth/me
Write-Host "`n--- TEST: POST /api/teams ---"
curl.exe -s -X POST http://localhost:3000/api/teams -H "Content-Type: application/json" -b cookies.txt -d "@payload.json"
Write-Host "`n--- TEST: GET /api/teams ---"
curl.exe -s http://localhost:3000/api/teams -b cookies.txt
Write-Host ""
