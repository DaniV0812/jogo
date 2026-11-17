param(
  [int]$Port = 8000,
  [switch]$NoBrowser
)

# Servidor HTTP minimo em PowerShell puro (sem Node/Python).
# Uso: powershell -ExecutionPolicy Bypass -File start.ps1

$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))

try {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  $listener.Start()
} catch {
  Write-Host "Nao consegui abrir a porta $Port. Feche o outro programa ou use: .\start.ps1 -Port 8080" -ForegroundColor Red
  exit 1
}

$url = "http://localhost:$Port/"
Write-Host ""
Write-Host "  DEFENSOR DO ESPACO" -ForegroundColor Cyan
Write-Host "  Servindo: $root"
Write-Host "  Abra:     $url"
Write-Host "  (Ctrl+C encerra o servidor)"
Write-Host ""

if (-not $NoBrowser) {
  Start-Process $url
}

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
}

function Send-Response {
  param($Stream, [int]$Status, [string]$StatusText, [string]$ContentType, [byte[]]$Body)

  $head = "HTTP/1.1 $Status $StatusText`r`n" +
          "Content-Type: $ContentType`r`n" +
          "Content-Length: $($Body.Length)`r`n" +
          "Cache-Control: no-store`r`n" +
          "Connection: close`r`n`r`n"
  $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
  $Stream.Write($headBytes, 0, $headBytes.Length)
  if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

$safeRoot = $root.TrimEnd('\') + '\'

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

    while ($true) {
      $line = $reader.ReadLine()
      if ($null -eq $line -or $line -eq '') { break }
    }

    $parts = $requestLine -split ' '
    $method = $parts[0]
    $rawPath = ($parts[1] -split '\?')[0]
    $decoded = [System.Uri]::UnescapeDataString($rawPath)
    if ($decoded -eq '/') { $decoded = '/index.html' }

    $relative = $decoded.TrimStart([char]'/') -replace '/', '\'
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

    if (-not $full.StartsWith($safeRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('403 Proibido')
      Send-Response $stream 403 'Forbidden' 'text/plain; charset=utf-8' $body
      continue
    }

    if ($method -ne 'GET' -and $method -ne 'HEAD') {
      $body = [System.Text.Encoding]::UTF8.GetBytes('405 Metodo nao permitido')
      Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' $body
      continue
    }

    if (Test-Path -LiteralPath $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $type = $types[$ext]
      if (-not $type) { $type = 'application/octet-stream' }
      Send-Response $stream 200 'OK' $type $bytes
    } else {
      $body = [System.Text.Encoding]::UTF8.GetBytes('404 Nao encontrado')
      Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' $body
    }
  } catch {
    # conexao cancelada pelo navegador: ignora
  } finally {
    $client.Close()
  }
}
