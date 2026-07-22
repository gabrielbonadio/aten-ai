# Recria junctions em .agent-skills -> %USERPROFILE%\.claude\skills ou .agents\skills
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$profile = $env:USERPROFILE
$destBase = Join-Path $root ".agent-skills"

# Name = pasta em .agent-skills; Source = subpath em %USERPROFILE%
$skills = @(
    @{ Name = "security"; Source = ".claude\skills\security" },
    @{ Name = "frontend-design"; Source = ".claude\skills\frontend-design" },
    @{ Name = "scalability"; Source = ".claude\skills\scalability" },
    @{ Name = "cost-reducer"; Source = ".claude\skills\cost-reducer" },
    @{ Name = "customer-support"; Source = ".claude\skills\customer-support" },
    @{ Name = "researcher"; Source = ".claude\skills\researcher" },
    @{ Name = "self-healing"; Source = ".claude\skills\self-healing" },
    @{ Name = "nodejs-best-practices"; Source = ".agents\skills\nodejs-best-practices" },
    @{ Name = "typescript-advanced-types"; Source = ".agents\skills\typescript-advanced-types" },
    @{ Name = "writing-plans"; Source = ".agents\skills\writing-plans" },
    @{ Name = "systematic-debugging"; Source = ".agents\skills\systematic-debugging" },
    @{ Name = "find-skills"; Source = ".agents\skills\find-skills" },
    @{ Name = "web-design-guidelines"; Source = ".agents\skills\web-design-guidelines" }
)

New-Item -ItemType Directory -Path $destBase -Force | Out-Null
foreach ($s in $skills) {
    $t = Join-Path $profile $s.Source
    $d = Join-Path $destBase $s.Name
    if (-not (Test-Path $t)) {
        Write-Warning "Origem em falta: $t"
        continue
    }
    if (Test-Path $d) {
        Remove-Item $d -Force -Recurse
    }
    New-Item -ItemType Junction -Path $d -Target $t | Out-Null
    Write-Host "OK $($s.Name)"
}
