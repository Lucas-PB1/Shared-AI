# Executado no login/boot.
#   BOOT_SYNC=on    → git pull --ff-only + npm run sync (executa o código novo do clone)
#   BOOT_SYNC=check → só git fetch + registra no log os commits pendentes (não executa nada novo)
# Autossuficiente — funciona instalado em ~/.cursor ou no repo.
$ErrorActionPreference = 'Continue'

$cursorDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
$stateFile = Join-Path $cursorDir 'shared-ai/boot-sync.env'
$envFile = Join-Path $cursorDir 'shared-ai.env'
$logFile = Join-Path $cursorDir 'shared-ai/boot-sync.log'

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
if ($bootSync -notin @('on', 'check')) { exit 0 }

$root = $null
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^SHARED_AI_ROOT=(.+)$') {
            $root = $Matches[1].Trim().Trim("'").Trim('"')
        }
    }
}

if (-not $root -or -not (Test-Path -LiteralPath $root)) {
    Write-StartupLog "clone ausente: $root"
    exit 0
}

Write-StartupLog "início boot sync (mode=$bootSync, root=$root)"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-StartupLog 'git indisponível'
    if ($bootSync -eq 'check') { exit 0 }
} elseif ($bootSync -eq 'check') {
    $fetchOut = git -C $root fetch --quiet 2>&1
    $fetchOut | Out-File -FilePath $logFile -Append -Encoding UTF8
    if ($LASTEXITCODE -ne 0) {
        Write-StartupLog 'git fetch falhou'
        exit 0
    }
    $pending = git -C $root log --oneline 'HEAD..@{upstream}' 2>$null
    if ($pending) {
        Write-StartupLog 'commits pendentes (revise e rode git pull && npm run sync):'
        $pending | ForEach-Object { "    $_" } | Out-File -FilePath $logFile -Append -Encoding UTF8
    } else {
        Write-StartupLog 'clone em dia com o upstream'
    }
    Write-StartupLog 'fim boot sync (check — nada executado)'
    exit 0
} else {
    $before = git -C $root rev-parse HEAD 2>$null
    $pullOut = git -C $root pull --ff-only 2>&1
    $pullCode = $LASTEXITCODE
    $pullOut | Out-File -FilePath $logFile -Append -Encoding UTF8
    if ($pullCode -eq 0) {
        $after = git -C $root rev-parse HEAD 2>$null
        if ($before -and $before -ne $after) {
            Write-StartupLog "git pull ok — aplicado $($before.Substring(0, 12))..$($after.Substring(0, 12)):"
            git -C $root log --oneline "$before..$after" 2>$null |
                ForEach-Object { "    $_" } | Out-File -FilePath $logFile -Append -Encoding UTF8
        } else {
            Write-StartupLog 'git pull ok (sem mudanças)'
        }
    } else {
        Write-StartupLog 'git pull falhou (sync local continua)'
    }
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    $runMjs = Join-Path $root 'packages/cursor/scripts/mjs/run.mjs'
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
