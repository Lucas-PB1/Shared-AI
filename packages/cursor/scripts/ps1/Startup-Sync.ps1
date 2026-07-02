# Executado no login/boot: git pull + sync se boot sync estiver ON.
# Autossuficiente — funciona instalado em ~/.cursor ou no repo.
$ErrorActionPreference = 'Continue'

$cursorDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
$stateFile = Join-Path $cursorDir 'hostdime-ia/boot-sync.env'
$envFile = Join-Path $cursorDir 'hostdime-ia.env'
$logFile = Join-Path $cursorDir 'hostdime-ia/boot-sync.log'

function Write-StartupLog {
    param([string]$Message)
    $dir = Split-Path $logFile -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Add-Content -Path $logFile -Value "[$((Get-Date).ToString('o'))] $Message"
}

$bootSync = 'off'
if (Test-Path $stateFile) {
    Get-Content $stateFile | ForEach-Object {
        if ($_ -match '^BOOT_SYNC=(.+)$') { $bootSync = $Matches[1] }
    }
}
if ($bootSync -ne 'on') { exit 0 }

$root = $null
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^HOSTDIME_IA_ROOT=(.+)$') {
            $root = $Matches[1].Trim().Trim("'").Trim('"')
        }
    }
}

if (-not $root -or -not (Test-Path -LiteralPath $root)) {
    Write-StartupLog "clone ausente: $root"
    exit 0
}

Write-StartupLog "início boot sync (root=$root)"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Push-Location $root
    try {
        $pullOut = git pull --ff-only 2>&1
        $pullOut | Out-File -FilePath $logFile -Append -Encoding UTF8
        Write-StartupLog 'git pull ok'
    } catch {
        Write-StartupLog 'git pull falhou (sync local continua)'
    } finally {
        Pop-Location
    }
} else {
    Write-StartupLog 'git indisponível'
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    $runMjs = Join-Path $root 'packages/cursor/scripts/run.mjs'
    try {
        $syncOut = node $runMjs sync 2>&1
        $syncOut | Out-File -FilePath $logFile -Append -Encoding UTF8
        Write-StartupLog 'sync ok'
    } catch {
        Write-StartupLog 'sync falhou'
    }
} else {
    Write-StartupLog 'node não encontrado no PATH'
}

Write-StartupLog 'fim boot sync'
exit 0
