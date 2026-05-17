# 一键自检（仓库根跑）—— Windows PowerShell
#
# 用法：.\scripts\verify-all.ps1
# 任一红 = 整体红，exit 1。

$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\.."
$failed = @()

function Step($name, $block) {
  Write-Host "▶  $name" -ForegroundColor Cyan
  try {
    & $block
    Write-Host "✔  $name" -ForegroundColor Green
  } catch {
    Write-Host "✖  $name`n   $_" -ForegroundColor Red
    $script:failed += $name
  }
}

function Run-Pnpm($cmd, $cwd) {
  Push-Location $cwd
  try {
    & corepack pnpm $cmd
    if ($LASTEXITCODE -ne 0) { throw "pnpm $cmd exit=$LASTEXITCODE" }
  } finally { Pop-Location }
}

function Run-Uv($cmd, $cwd) {
  $uv = "$env:APPDATA\Python\Python314\Scripts\uv.exe"
  if (-not (Test-Path $uv)) { $uv = 'uv' }  # PATH 上有的话用 PATH 的
  Push-Location $cwd
  try {
    & $uv run $cmd.Split(' ')
    if ($LASTEXITCODE -ne 0) { throw "uv $cmd exit=$LASTEXITCODE" }
  } finally { Pop-Location }
}

# --------- 前端 ---------
$web = "$root\apps\web"
Step "[1/7] frontend lint"      { Run-Pnpm 'lint' $web }
Step "[2/7] frontend tests"     { Run-Pnpm 'test' $web }
Step "[3/7] frontend typecheck" { Run-Pnpm 'typecheck' $web }

# --------- 后端 query ---------
$q = "$root\services\report-query"
Step "[4/7] report-query ruff"   { Run-Uv 'ruff check .' $q }
Step "[5/7] report-query mypy"   { Run-Uv 'mypy app' $q }
Step "[6/7] report-query pytest" { Run-Uv 'pytest -q' $q }

# --------- 后端 generation ---------
$g = "$root\services\report-generation"
Step "[7/7] report-generation ruff+mypy+pytest" {
  Run-Uv 'ruff check .' $g
  Run-Uv 'mypy app' $g
  Run-Uv 'pytest -q' $g
}

# --------- Docker config (optional) ---------
if (Get-Command docker -ErrorAction SilentlyContinue) {
  Step "[bonus] docker compose config" {
    docker compose -f "$root\docker-compose.yml" config | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "compose config failed" }
  }
}

Write-Host ""
if ($failed.Count -eq 0) {
  Write-Host "═══════════════════════════════" -ForegroundColor Green
  Write-Host "      ALL CHECKS PASSED" -ForegroundColor Green
  Write-Host "═══════════════════════════════" -ForegroundColor Green
  exit 0
} else {
  Write-Host "═══════════════════════════════" -ForegroundColor Red
  Write-Host "  FAILED:" -ForegroundColor Red
  foreach ($f in $failed) { Write-Host "    - $f" -ForegroundColor Red }
  Write-Host "═══════════════════════════════" -ForegroundColor Red
  exit 1
}
