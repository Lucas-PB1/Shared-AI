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

function Write-RegistryJson {
    param(
        [Parameter(Mandatory)][string]$File,
        [Parameter(Mandatory)]$Data
    )
    $json = ($Data | ConvertTo-Json -Depth 5) + "`n"
    [System.IO.File]::WriteAllText($File, $json) # UTF-8 sem BOM
}

function Ensure-Registry {
    $dir = Get-RegistryDir
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $file = Get-RegistryFile
    if (-not (Test-Path $file)) {
        [System.IO.File]::WriteAllText($file, "{`"projects`":[]}`n")
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
    if ($null -eq $data.PSObject.Properties['projects']) {
        $data | Add-Member -NotePropertyName projects -NotePropertyValue @()
    }

    $projects = @($data.projects)
    $now = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $found = $false

    foreach ($p in $projects) {
        $existing = (Get-AbsolutePath $p.path)
        if ($existing -eq $realPath) {
            $p.lastLinked = $now
            $found = $true
            break
        }
    }

    if (-not $found) {
        $projects += [PSCustomObject]@{
            path        = $realPath
            firstLinked = $now
            lastLinked  = $now
        }
    }

    $data.projects = @($projects)
    Write-RegistryJson -File $file -Data $data
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
    Write-RegistryJson -File $file -Data $data
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

    Write-RegistryJson -File $file -Data $data
}
