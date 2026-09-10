# Registro de projetos ligados ao shared-ai

function Get-RegistryDir {
    return Join-Path (Get-CursorUserDir) 'shared-ai'
}

function Get-RegistryFile {
    return Join-Path (Get-RegistryDir) 'projects.json'
}

function Test-EphemeralPath {
    param([string]$Path)

    if (-not $Path) { return $true }
    $real = (Get-AbsolutePath $Path)
    if (-not $real) { return $true }

    $normalized = $real.TrimEnd('\', '/').ToLowerInvariant()
    if ($normalized -in @('c:\tmp', 'c:\temp', '/tmp', '/var/tmp')) { return $true }
    if ($normalized -match '^/tmp/' -or $normalized -match '^/var/tmp/') { return $true }
    if ($normalized -match '^[a-z]:\\tmp\\' -or $normalized -match '^[a-z]:\\temp\\') { return $true }
    return $false
}

function Ensure-Registry {
    $dir = Get-RegistryDir
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $file = Get-RegistryFile
    if (-not (Test-Path $file)) {
        Set-Content -Path $file -Value '{"projects":[]}' -Encoding UTF8
    }
}

function Register-Project {
    param([Parameter(Mandatory)][string]$Path)

    Ensure-Registry
    $realPath = (Get-AbsolutePath $Path)
    if (-not $realPath) { return }

    if (Test-EphemeralPath $realPath) { return }

    $file = Get-RegistryFile
    $data = Get-Content $file -Raw | ConvertFrom-Json
    if (-not $data.projects) {
        $data | Add-Member -NotePropertyName projects -NotePropertyValue @()
    }

    $now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $found = $false

    foreach ($p in $data.projects) {
        $existing = (Get-AbsolutePath $p.path)
        if ($existing -eq $realPath) {
            $p.lastLinked = $now
            $found = $true
            break
        }
    }

    if (-not $found) {
        $data.projects += [PSCustomObject]@{
            path        = $realPath
            firstLinked = $now
            lastLinked  = $now
        }
    }

    ($data | ConvertTo-Json -Depth 5) + "`n" | Set-Content -Path $file -Encoding UTF8
}

function Get-RegisteredProjects {
    Ensure-Registry
    $data = Get-Content (Get-RegistryFile) -Raw | ConvertFrom-Json
    foreach ($p in $data.projects) {
        if ($p.path) { $p.path }
    }
}

function Unregister-Project {
    param([Parameter(Mandatory)][string]$Path)

    Ensure-Registry
    $realPath = (Get-AbsolutePath $Path)
    $file = Get-RegistryFile
    $data = Get-Content $file -Raw | ConvertFrom-Json
    $before = @($data.projects).Count

    $data.projects = @(
        $data.projects | Where-Object {
            (Get-AbsolutePath $_.path) -ne $realPath
        }
    )

    $after = @($data.projects).Count
    ($data | ConvertTo-Json -Depth 5) + "`n" | Set-Content -Path $file -Encoding UTF8
    return ($before -gt $after)
}

function Remove-MissingProjects {
    Ensure-Registry
    $file = Get-RegistryFile
    $data = Get-Content $file -Raw | ConvertFrom-Json

    $data.projects = @(
        $data.projects | Where-Object {
            $path = $_.path
            $path -and (Test-Path -LiteralPath $path) -and -not (Test-EphemeralPath $path)
        }
    )

    ($data | ConvertTo-Json -Depth 5) + "`n" | Set-Content -Path $file -Encoding UTF8
}
