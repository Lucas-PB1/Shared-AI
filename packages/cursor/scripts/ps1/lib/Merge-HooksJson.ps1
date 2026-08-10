# Merge idempotente do sessionStart hostdime-ia em ~/.cursor/hooks.json

function Get-HostdimeTsx {
    param([string]$Root)
    if ($Root) {
        $tsx = Join-Path $Root 'node_modules/.bin/tsx.cmd'
        if (Test-Path -LiteralPath $tsx) { return $tsx }
        $tsx = Join-Path $Root 'node_modules/.bin/tsx'
        if (Test-Path -LiteralPath $tsx) { return $tsx }
    }
    $cmd = Get-Command tsx -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Merge-HostdimeHooksJson {
    param([Parameter(Mandatory)][string]$CursorPkg)

    $cursorDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
    $hooksFile = Join-Path $cursorDir 'hooks.json'
    $example = Join-Path $CursorPkg 'scripts/hooks/hooks.json.example'
    $mergeTs = Join-Path $CursorPkg 'scripts/lib/install/ts/merge-hooks-json.ts'

    if (-not (Test-Path $mergeTs)) {
        Write-Error 'merge-hooks-json.ts não encontrado'
        return $false
    }

    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root) {
        $envFile = Join-Path $env:USERPROFILE '.cursor/hostdime-ia.env'
        if (Test-Path -LiteralPath $envFile) {
            Get-Content -LiteralPath $envFile | ForEach-Object {
                if ($_ -match '^HOSTDIME_IA_ROOT=(.+)$') { $root = $Matches[1].Trim('"') }
            }
        }
    }

    $tsx = Get-HostdimeTsx -Root $root
    if (-not $tsx) {
        Write-Error 'tsx não encontrado (npm install na raiz do monorepo)'
        return $false
    }

    $hooksDir = Join-Path $cursorDir 'hooks'
    if (-not (Test-Path $hooksDir)) {
        New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    }

    $result = & $tsx $mergeTs $hooksFile $example 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'hooks.json — merge falhou'
        return $false
    }

    $action = ($result | Select-Object -Last 1).ToString().Trim()
    switch ($action) {
        'created' { Write-Host '→ hooks.json criado (sessionStart → ensure-project-cursor)' }
        'merged'  { Write-Host '→ hooks.json atualizado (sessionStart → ensure-project-cursor, hooks existentes preservados)' }
        'ok'      { Write-Host '→ hooks.json ok (sessionStart hostdime-ia já presente)' }
        default {
            Write-Error "hooks.json — resposta inesperada do merge: $action"
            return $false
        }
    }
    return $true
}
