# Instala pacote skills (rules, skills cursor, motor) em ~/.cursor/
# Uso: npm run setup:skills
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Merge-HooksJson.ps1')
. (Join-Path $LibRoot 'Install-Packages.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$cursorDir = Get-CursorUserDir

Write-Host "Skills — instalando em $cursorDir"
Write-Host ''

Install-SkillsPackage $MonorepoRoot

Write-Host ''
Write-Host 'Skills instaladas.'
Write-Host 'Próximo: npm run bootstrap -- C:\caminho\do\seu\repo'
