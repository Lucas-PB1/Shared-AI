# Instala pacote code-review em ~/.cursor/
# Uso: npm run setup:code-review (via run.mjs)
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'Hostdime-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Install-Packages.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$cursorDir = Get-CursorUserDir

Write-Host "Code review — instalando em $cursorDir"
Write-Host ''

Install-CodeReviewPackage $MonorepoRoot

Write-Host ''
Write-Host 'Code review instalado.'
Write-Host 'Próximo: npm run bootstrap -- C:\caminho\do\seu\repo'
