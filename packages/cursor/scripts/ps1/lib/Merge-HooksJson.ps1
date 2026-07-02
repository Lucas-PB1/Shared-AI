# Merge idempotente do sessionStart hostdime-ia em ~/.cursor/hooks.json

function Merge-HostdimeHooksJson {
    param([Parameter(Mandatory)][string]$CursorPkg)

    $cursorDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
    $hooksFile = Join-Path $cursorDir 'hooks.json'
    $example = Join-Path $CursorPkg 'scripts/hooks/hooks.json.example'
    $mergePy = Join-Path $CursorPkg 'scripts/lib/merge-hooks-json.py'

    if (-not (Test-Path $mergePy)) {
        Write-Error 'merge-hooks-json.py não encontrado'
        return $false
    }

    $python = $null
    foreach ($cmd in @('python', 'python3', 'py')) {
        if (Get-Command $cmd -ErrorAction SilentlyContinue) {
            $python = $cmd
            break
        }
    }

    if (-not $python) {
        Write-Error 'Python não encontrado (necessário para merge de hooks.json)'
        return $false
    }

    $hooksDir = Join-Path $cursorDir 'hooks'
    if (-not (Test-Path $hooksDir)) {
        New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
    }

    $result = & $python $mergePy $hooksFile $example 2>&1
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
