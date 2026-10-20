$body = @{
  jsonrpc = "2.0"
  id = 1
  method = "tools/call"
  params = @{
    name = "ghl_get_email_templates"
    arguments = @{ includeFolders = $true }
  }
} | ConvertTo-Json -Depth 5

$resp = Invoke-RestMethod -Uri "https://ghl-mcp-remote.vercel.app/api/mcp" -Method POST -ContentType "application/json" -Body $body
$parsed = $resp.result.content[0].text | ConvertFrom-Json

Write-Host "Templates found: $($parsed.count)" -ForegroundColor Yellow
Write-Host "Folders found:   $($parsed.folderCount)" -ForegroundColor Yellow

Write-Host "`nFirst 10 templates:" -ForegroundColor Cyan
$parsed.templates | Select-Object -First 10 | Format-Table name, id, parentId -AutoSize

Write-Host "`nFolders:" -ForegroundColor Cyan
$parsed.folders | Format-Table name, id, childCount -AutoSize
