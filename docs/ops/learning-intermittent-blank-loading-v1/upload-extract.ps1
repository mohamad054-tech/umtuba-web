$ErrorActionPreference = "Stop"
$kh = "$env:USERPROFILE\.ssh\umtuba_hetzner_known_hosts"
$key = "$env:USERPROFILE\.ssh\id_ed25519"
$rel = (Get-Content "docs/ops/learning-intermittent-blank-loading-v1/REL.txt" -Raw).Trim()
$opt = @(
  "-o", "BatchMode=yes",
  "-o", "IdentitiesOnly=yes",
  "-o", "StrictHostKeyChecking=yes",
  "-o", "UserKnownHostsFile=$kh",
  "-i", $key
)
Write-Output "UPLOAD_REL=$rel"
& scp @opt -P 22 "docs/ops/learning-intermittent-blank-loading-v1/release.tar.gz" "root@178.104.196.2:/tmp/umtuba-learning-release.tar.gz"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& scp @opt -P 22 "docs/ops/learning-intermittent-blank-loading-v1/host-build-release.sh" "root@178.104.196.2:/tmp/umtuba-learning-host-build-release.sh"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& scp @opt -P 22 "docs/ops/learning-intermittent-blank-loading-v1/host-switch-release.sh" "root@178.104.196.2:/tmp/umtuba-learning-host-switch-release.sh"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$remote = @"
set -euo pipefail
echo '$rel' > /tmp/umtuba-learning-rel.txt
sed -i 's/\r`$//' /tmp/umtuba-learning-rel.txt /tmp/umtuba-learning-host-build-release.sh /tmp/umtuba-learning-host-switch-release.sh
chmod +x /tmp/umtuba-learning-host-build-release.sh /tmp/umtuba-learning-host-switch-release.sh
mkdir -p /opt/umtuba/production/releases/$rel /opt/umtuba/production/logs
tar -xzf /tmp/umtuba-learning-release.tar.gz -C /opt/umtuba/production/releases/$rel
test -f /opt/umtuba/production/releases/$rel/app/learning/page.tsx
test -f /opt/umtuba/production/releases/$rel/app/learning/loading.tsx
echo EXTRACT=PASS
readlink -f /opt/umtuba/production/current
"@
& ssh @opt -p 22 "root@178.104.196.2" $remote
exit $LASTEXITCODE
