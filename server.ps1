$port = 8080
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "Server running on port $port"
$root = $PSScriptRoot

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $line = $reader.ReadLine()
        if ($line) {
            $parts = $line.Split(' ')
            if ($parts.Length -ge 2) {
                $path = $parts[1]
                if ($path -eq "/") { $path = "/index.html" }
                $cleanPath = $path.Split('?')[0].TrimStart('/').Replace('/', '\')
                $localPath = Join-Path $root $cleanPath

                if (Test-Path $localPath -PathType Leaf) {
                    $bytes = [System.IO.File]::ReadAllBytes($localPath)
                    $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                    $mime = switch ($ext) {
                        ".html" { "text/html; charset=utf-8" }
                        ".css"  { "text/css; charset=utf-8" }
                        ".js"   { "application/javascript; charset=utf-8" }
                        ".png"  { "image/png" }
                        ".jpg"  { "image/jpeg" }
                        ".svg"  { "image/svg+xml" }
                        default { "application/octet-stream" }
                    }
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $msg = "HTTP/1.1 404 Not Found`r`nConnection: close`r`n`r`n404 Not Found"
                    $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
                    $stream.Write($msgBytes, 0, $msgBytes.Length)
                }
            }
        }
        $client.Close()
    } catch {
        Write-Host "Error handling request: $_"
    }
}
