$ErrorActionPreference = 'Continue'
$gv = 'best-time-golf-trip-cap-cana','cap-cana-luxury-villa-rentals','punta-espada-golf-villa-guide','best-caribbean-golf-destinations-for-groups','corporate-golf-retreat-caribbean-villas-vs-hotels','where-can-i-rent-a-villa-with-direct-access-to-a-golf-course','punta-espada-villa-rentals','punta-cana-golf-villas','luxury-golf-villas-dominican-republic-tourism-surge','corales-puntacana-championship-2026-caribbean-golf-villas','luxury-golf-villas-vs-resort-blocks','punta-cana-golf-packages-villa-vs-resort'
$urls = @()
foreach ($s in $gv) { $urls += "https://www.golfvilla.com/blog/$s" }
$urls += 'https://www.espadavilla.com/blog/sargassum-cap-cana','https://www.espadavilla.com/blog/cap-cana-golf-residences-villa-espada-playbook','https://www.espadavilla.com/experiences/cap-cana-events','https://www.espadavilla.com/experiences','https://www.espadavilla.com/compare/cap-cana-villa-vs-eden-roc-hotel','https://www.espadavilla.com/blog/cap-cana-golf-trip-itinerary'
$pat = '\$182|\$232|\$245|\$4,900|\$5,100|\$4,400|\$220 |front nine|back nine|three minutes|3 minutes|3-minute|three-minute|member pricing|June 28|same whether|\$280|\$281|per person a night'
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri ($u + '?cb=' + (Get-Random)) -UseBasicParsing -Headers @{'Cache-Control'='no-cache'} -TimeoutSec 30
    $t = $r.Content -replace '(?s)<style.*?</style>','' -replace '<[^>]+>',' ' -replace '&nbsp;',' ' -replace '&#8212;|&mdash;','-' -replace '\s+',' '
    Write-Output "=== $u [$($r.StatusCode)] len=$($t.Length)"
    $ms = [regex]::Matches($t, $pat)
    $seen = @{}
    foreach ($m in $ms) {
      $st = [Math]::Max(0, $m.Index - 110); $ln = [Math]::Min(240, $t.Length - $st)
      $snip = $t.Substring($st, $ln)
      if (-not $seen.ContainsKey($snip)) { $seen[$snip]=1; Write-Output ("  [" + $m.Value + "] ..." + $snip + "...") }
    }
  } catch { Write-Output "=== $u ERROR $($_.Exception.Message)" }
}
