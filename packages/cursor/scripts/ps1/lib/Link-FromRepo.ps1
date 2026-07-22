# Symlink seguro com fallback Junction (dirs) / HardLink (files) no Windows.
# Dot-source: . "$PSScriptRoot/lib/Link-FromRepo.ps1"

$script:LinkLinked = 0
$script:LinkSkipped = 0
$script:LinkBroken = 0
$script:LinkReportFile = $env:LINK_REPORT_FILE

function Reset-LinkCounters {
    $script:LinkLinked = 0
    $script:LinkSkipped = 0
    $script:LinkBroken = 0
    $script:LinkOrchestratorRemoved = 0
    $script:LinkCommandsRemoved = 0
}

function Remove-ProjectOrchestratorRuleSymlinks {
    param([Parameter(Mandatory)][string]$RulesDir)

    $script:LinkOrchestratorRemoved = 0
    if (-not (Test-Path -LiteralPath $RulesDir)) { return }

    foreach ($f in Get-ChildItem -Path (Join-Path $RulesDir 'skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
        if (Test-HostdimeSymlink $f.FullName) {
            $name = $f.Name
            Remove-Item -LiteralPath $f.FullName -Force
            $script:LinkOrchestratorRemoved++
            Write-LinkReport 'removed' "$RulesDir/$name (orquestrador global)"
        }
    }
}

function Remove-ProjectManagedCommandSymlinks {
    param([Parameter(Mandatory)][string]$CommandsDir)

    $script:LinkCommandsRemoved = 0
    if (-not (Test-Path -LiteralPath $CommandsDir)) { return }

    foreach ($f in Get-ChildItem -Path (Join-Path $CommandsDir '*.md') -ErrorAction SilentlyContinue) {
        if (Test-HostdimeSymlink $f.FullName) {
            $name = $f.Name
            Remove-Item -LiteralPath $f.FullName -Force
            $script:LinkCommandsRemoved++
            Write-LinkReport 'removed' "$CommandsDir/$name (command global)"
        }
    }
}

function Write-LinkReport {
    param([string]$Kind, [string]$Message)
    if ($script:LinkReportFile) {
        Add-Content -Path $script:LinkReportFile -Value "$Kind|$Message"
    }
}

function Get-AbsolutePath {
    param([string]$Path)
    if (-not $Path) { return $null }
    if (-not (Test-Path -LiteralPath $Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return (Resolve-Path -LiteralPath $Path).Path
}

function Get-SameVolume {
    param([string]$PathA, [string]$PathB)
    $rootA = [System.IO.Path]::GetPathRoot((Get-AbsolutePath $PathA))
    $rootB = [System.IO.Path]::GetPathRoot((Get-AbsolutePath $PathB))
    return ($rootA -eq $rootB)
}

function Remove-LinkTarget {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $item = Get-Item -LiteralPath $Path -Force
    if ($item.PSIsContainer) {
        Remove-Item -LiteralPath $Path -Force -Recurse
    } else {
        Remove-Item -LiteralPath $Path -Force
    }
}

function New-HostdimeLink {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Dest
    )

    $srcFull = Get-AbsolutePath $Source
    if (-not $srcFull -or -not (Test-Path -LiteralPath $srcFull)) {
        throw "Origem inexistente: $Source"
    }

    $destParent = Split-Path -Parent $Dest
    if ($destParent -and -not (Test-Path $destParent)) {
        New-Item -ItemType Directory -Path $destParent -Force | Out-Null
    }

    if (Test-Path -LiteralPath $Dest) {
        Remove-LinkTarget $Dest
    }

    $isDir = Test-Path -LiteralPath $srcFull -PathType Container

    try {
        if ($isDir) {
            New-Item -ItemType SymbolicLink -Path $Dest -Target $srcFull -Force | Out-Null
        } else {
            New-Item -ItemType SymbolicLink -Path $Dest -Target $srcFull -Force | Out-Null
        }
        return 'SymbolicLink'
    } catch {
        if ($isDir) {
            $null = cmd /c mklink /J "$Dest" "$srcFull" 2>&1
            if ($LASTEXITCODE -eq 0) { return 'Junction' }
            throw "Falha ao criar junction: $Dest -> $srcFull"
        }

        if (-not (Get-SameVolume $srcFull $Dest)) {
            throw @(
                "HardLink exige mesmo volume que o destino.",
                "Clone: $srcFull",
                "Destino: $Dest",
                "Ative Developer Mode (symlink) ou coloque o clone no mesmo drive que $env:USERPROFILE"
            ) -join "`n"
        }

        $null = cmd /c mklink /H "$Dest" "$srcFull" 2>&1
        if ($LASTEXITCODE -eq 0) { return 'HardLink' }
        throw "Falha ao criar hardlink: $Dest -> $srcFull"
    }
}

function Test-HostdimeSymlink {
    param([string]$Path)

    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path -LiteralPath $Path)) { return $false }

    $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    if (-not $item) { return $false }

    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        $target = $null
        if ($item.Target) {
            $target = if ($item.Target -is [array]) { $item.Target[0] } else { $item.Target }
        }
        if (-not $target) {
            $target = (Get-AbsolutePath $Path)
        } else {
            if (-not [IO.Path]::IsPathRooted($target)) {
                $target = Join-Path (Split-Path -Parent $Path) $target
            }
            $target = Get-AbsolutePath $target
        }
        return ($target -like "$root*")
    }

    return $false
}

function Test-HostdimeHardlink {
    param(
        [string]$Path,
        [string]$ExpectedSource
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    if (-not (Test-Path -LiteralPath $ExpectedSource -PathType Leaf)) { return $false }

    try {
        $out = cmd /c "fsutil hardlink list `"$Path`"" 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
        $expected = (Get-AbsolutePath $ExpectedSource).ToLowerInvariant()
        foreach ($line in ($out -split "`n")) {
            $line = $line.Trim().ToLowerInvariant()
            if ($line -and $line -eq $expected) { return $true }
        }
    } catch {
        return $false
    }
    return $false
}

function Test-HostdimeManagedLink {
    param(
        [string]$Path,
        [string]$ExpectedSource = ''
    )

    if (Test-HostdimeSymlink $Path) { return $true }
    if ($ExpectedSource -and (Test-HostdimeHardlink $Path $ExpectedSource)) { return $true }
    return $false
}

function Link-File {
    param(
        [Parameter(Mandatory)][string]$Src,
        [Parameter(Mandatory)][string]$DestDir
    )

    if (-not (Test-Path -LiteralPath $Src -PathType Leaf)) { return }

    $name = Split-Path -Leaf $Src
    $dest = Join-Path $DestDir $name

    if ((Test-Path -LiteralPath $dest) -and -not (Test-HostdimeSymlink $dest) -and -not (Test-HostdimeHardlink $dest $Src)) {
        $script:LinkSkipped++
        Write-LinkReport 'skipped' "$dest (arquivo real — não sobrescrito)"
        return
    }

    if ((Test-Path -LiteralPath $dest) -and (Test-HostdimeSymlink $dest) -and -not (Test-Path -LiteralPath $dest)) {
        $script:LinkBroken++
        Write-LinkReport 'broken' $dest
    }

    $current = if (Test-Path -LiteralPath $dest) { Get-AbsolutePath $dest } else { $null }
    $targetPath = Get-AbsolutePath $Src

    if ($current -eq $targetPath) { return }
    if ((Test-Path -LiteralPath $dest) -and (Test-HostdimeManagedLink $dest $Src)) {
        $linkedTarget = Get-AbsolutePath $Src
        if ((Test-HostdimeHardlink $dest $Src) -or (Test-HostdimeSymlink $dest)) {
            return
        }
    }

    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    }

    $linkType = New-HostdimeLink -Source $Src -Dest $dest
    $script:LinkLinked++
    Write-LinkReport 'linked' "$dest -> $Src ($linkType)"
}

function Link-Dir {
    param(
        [Parameter(Mandatory)][string]$Src,
        [Parameter(Mandatory)][string]$DestDir
    )

    if (-not (Test-Path -LiteralPath $Src -PathType Container)) { return }

    $name = Split-Path -Leaf $Src.TrimEnd('\', '/')
    $dest = Join-Path $DestDir $name

    if ((Test-Path -LiteralPath $dest) -and -not (Test-HostdimeSymlink $dest)) {
        $script:LinkSkipped++
        Write-LinkReport 'skipped' "$dest (pasta real — não sobrescrito)"
        return
    }

    if ((Test-Path -LiteralPath $dest) -and (Test-HostdimeSymlink $dest) -and -not (Test-Path -LiteralPath $dest)) {
        $script:LinkBroken++
        Write-LinkReport 'broken' $dest
    }

    $current = if (Test-Path -LiteralPath $dest) { Get-AbsolutePath $dest } else { $null }
    $targetPath = Get-AbsolutePath $Src
    if ($current -eq $targetPath) { return }

    if (-not (Test-Path $DestDir)) {
        New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
    }

    $linkType = New-HostdimeLink -Source $Src -Dest $dest
    $script:LinkLinked++
    Write-LinkReport 'linked' "$dest -> $Src ($linkType)"
}

function Link-Glob {
    param(
        [Parameter(Mandatory)][string]$Pattern,
        [Parameter(Mandatory)][string]$DestDir
    )

    foreach ($item in Get-Item -Path $Pattern -ErrorAction SilentlyContinue) {
        if ($item.PSIsContainer) {
            Link-Dir -Src $item.FullName -DestDir $DestDir
        } else {
            Link-File -Src $item.FullName -DestDir $DestDir
        }
    }
}

function Prune-ManagedSymlinks {
    param(
        [Parameter(Mandatory)][string]$Dir,
        [Parameter(Mandatory)][string[]]$ManagedNames
    )

    if (-not (Test-Path $Dir)) { return }

    foreach ($entry in Get-ChildItem -LiteralPath $Dir -Force -ErrorAction SilentlyContinue) {
        $name = $entry.Name
        if ($ManagedNames -contains $name) { continue }
        if (Test-HostdimeSymlink $entry.FullName) {
            Remove-Item -LiteralPath $entry.FullName -Force -Recurse -ErrorAction SilentlyContinue
            Write-LinkReport 'pruned' $entry.FullName
        }
    }
}
