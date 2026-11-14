# Small local web server for testing the app on this computer.
# Started by "Start Local Test Server.bat". Press Ctrl+C in the window to stop.
param([int]$Port = 8080)
$root = Split-Path -Parent $PSScriptRoot
$types = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.pdf'='application/pdf'; '.md'='text/plain; charset=utf-8'; '.txt'='text/plain; charset=utf-8'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch { Write-Host "Could not start on port $Port. Is it already running?"; exit 1 }
Write-Host ""
Write-Host "  Thermal Tech Study is running at:  http://localhost:$Port/"
Write-Host "  Leave this window open while testing. Press Ctrl+C to stop."
Write-Host ""
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path.EndsWith('/')) { $path += 'index.html' }
    $file = $null
    try { $file = [IO.Path]::GetFullPath((Join-Path $root ($path.TrimStart('/') -replace '/', '\'))) } catch { $file = $null }
    if ($file -and $file.StartsWith($root) -and (Test-Path -LiteralPath $file -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
      $res.Headers.Add('Cache-Control', 'no-cache')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes('Not found')
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.Close()
    Write-Host ("{0} {1} {2}" -f (Get-Date -Format HH:mm:ss), $res.StatusCode, $path)
  }
} finally { $listener.Stop() }
