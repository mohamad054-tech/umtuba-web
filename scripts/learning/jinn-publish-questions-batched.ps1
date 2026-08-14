# Publish remaining draft questions for Jinn AI Academy in small batches.
# Uses approved publish_learning_question RPC only. No schema/migration/reimport.

$ErrorActionPreference = 'Continue'
$dir = Join-Path $env:TEMP 'jinnai-controlled-publish'
$wt = 'D:\umtuba-central\repos\umtuba-web-learning-sot-ff-merge-v1'
$UID = '87368553-5380-4ba1-ac64-d43d3d693482'
$PROGRAM = '27778f84-e7f0-4b0f-9578-5b68438e4a27'
$batchSize = 10

New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $wt

function Invoke-DbQuery([string]$name, [string]$sql) {
  $path = Join-Path $dir "$name.sql"
  Set-Content -Path $path -Value $sql -Encoding ascii
  $out = Join-Path $dir "$name.out.json"
  cmd /c "npx supabase db query --linked -f `"$path`" --output-format json > `"$out`" 2>nul"
  return (Get-Content $out -Raw)
}

$stateSql = @"
select count(*) filter (where q.status='draft')::int as draft_q,
       count(*) filter (where q.status='published')::int as pub_q
from public.learning_questions q
join public.learning_activities a on a.id=q.activity_id
join public.learning_lessons l on l.id=a.lesson_id
join public.learning_sections s on s.id=l.section_id
join public.learning_courses c on c.id=s.course_id
where c.program_id='$PROGRAM'::uuid;
"@

$idsSql = @"
select q.id::text as question_id
from public.learning_questions q
join public.learning_activities a on a.id=q.activity_id
join public.learning_lessons l on l.id=a.lesson_id
join public.learning_sections s on s.id=l.section_id
join public.learning_courses c on c.id=s.course_id
where c.program_id='$PROGRAM'::uuid and q.status='draft'
order by c.position, s.position, l.position, a.position, q.position, q.id;
"@

$rawState = Invoke-DbQuery 'q_state_start' $stateSql
Write-Host "START_STATE=$rawState"
$rawIds = Invoke-DbQuery 'q_ids_all' $idsSql
$ids = @(((($rawIds.Substring($rawIds.IndexOf('{'))) | ConvertFrom-Json).rows) | ForEach-Object { $_.question_id })
Write-Host "draft_ids=$($ids.Count)"

$batchNum = 0
$failed = $false
for ($i = 0; $i -lt $ids.Count; $i += $batchSize) {
  $batchNum++
  $end = [Math]::Min($i + $batchSize - 1, $ids.Count - 1)
  $chunk = $ids[$i..$end]
  $values = ($chunk | ForEach-Object { "('$_'::uuid)" }) -join ','
  $sql = @"
select set_config('request.jwt.claim.sub', '$UID', true);
select set_config('role', 'authenticated', true);
select count(*)::int as published_now
from (
  select public.publish_learning_question(x.id) as r
  from (values $values) as x(id)
) t;
"@
  $r = Invoke-DbQuery "qb_$batchNum" $sql
  if ($r -match '"published_now"') {
    $n = ((($r.Substring($r.IndexOf('{'))) | ConvertFrom-Json).rows)[0].published_now
    Write-Host "batch $batchNum ok published_now=$n size=$($chunk.Count) progress=$($end+1)/$($ids.Count)"
  } else {
    Write-Host "batch $batchNum FAIL: $($r.Substring(0, [Math]::Min(400, $r.Length)))"
    $failed = $true
    break
  }
}

$rawFinal = Invoke-DbQuery 'q_state_end' $stateSql
Write-Host "FINAL_STATE=$rawFinal"
Write-Host "FAILED=$failed"
if ($failed) { exit 1 }
exit 0
