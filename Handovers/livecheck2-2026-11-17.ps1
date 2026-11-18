$ErrorActionPreference = 'Continue'
$checks = @(
 @('https://www.espadavilla.com/experiences/cap-cana-events','minute'),
 @('https://www.espadavilla.com/experiences','minute'),
 @('https://www.espadavilla.com/blog/punta-espada-golf-villa-luxury-group','foursome|12 golfers|twelve golfers|12 adults'),
 @('https://www.golfvilla.com/blog/punta-cana-golf-villas','members only')
)
foreach ($c in $checks) {
  $u = $c[0]; $pat = $c[1]
  $r = Invoke-WebRequest -Uri ($u + '?cb=' + (Get-Random)) -UseBasicParsing -TimeoutSec 30
  $t = $r.Content -replace '(?s)<style.*?</style>','' -replace '<[^>]+>',' ' -replace '&nbsp;',' ' -replace '\s+',' '
  Write-Output "=== $u [$($r.StatusCode)]"
  foreach ($m in [regex]::Matches($t, $pat, 'IgnoreCase')) {
    $st = [Math]::Max(0, $m.Index - 120); $ln = [Math]::Min(260, $t.Length - $st)
    Write-Output ("  ..." + $t.Substring($st, $ln) + "...")
  }
}
