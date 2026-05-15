$ErrorActionPreference = 'Stop'
$conf = & git diff --name-only --diff-filter=U
if ($conf -and $conf.Trim() -ne '') {
  $lines = $conf -split "\n"
  foreach ($f in $lines) {
    $f = $f.Trim()
    if ($f) {
      Write-Host "Resolving: $f"
      & git checkout --theirs -- "$f"
      & git add "$f"
    }
  }
  & git commit -m 'Merge fix/auth-improvements into prototype-frontend (prefer incoming changes)'
  & git push -u origin prototype-frontend
} else {
  Write-Host 'No conflicts'
}
