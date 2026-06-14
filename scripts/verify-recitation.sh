#!/usr/bin/env bash
# E2E verification of spec 005 (Quran recitation). Runs against the live DB; no wipe.
set -euo pipefail
API=${API:-http://localhost:3001}
RUN=$(date +%s)
MGR="mgr5.$RUN"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SA="$TMP/sa"; M="$TMP/m"
step(){ echo; echo "── $1"; }
fail(){ echo "✗ FAILED: $1" >&2; exit 1; }
json(){ python -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

step "Setup institute + manager + student + class"
curl -sf -c "$SA" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d '{"username":"admin","password":"Admin@123"}' >/dev/null
INST=$(curl -sf -b "$SA" -X POST "$API/api/institutes" -H 'Content-Type: application/json' -d "{\"name\":\"معهد 005\",\"place\":\"دمشق\",\"manager\":{\"firstName\":\"م\",\"lastName\":\"٥\",\"birthDate\":\"1980-01-01\",\"phone\":\"+963900000005\",\"username\":\"$MGR\",\"password\":\"Manager123!\"}}" | json "d['institute']['id']")
curl -sf -c "$M" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"$MGR\",\"password\":\"Manager123!\"}" >/dev/null
SID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/students" -H 'Content-Type: application/json' -d "{\"firstName\":\"تلميذ\",\"lastName\":\"٥\",\"birthDate\":\"2010-01-01\",\"phone\":\"+963933333333\",\"schoolGrade\":\"g6\",\"username\":\"st5.$RUN\",\"password\":\"Student123!\"}" | json "d['id']")
CID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/classes" -H 'Content-Type: application/json' -d '{"name":"حلقة ٥"}' | json "d['id']")
curl -sf -b "$M" -X POST "$API/api/classes/$CID/students" -H 'Content-Type: application/json' -d "{\"userId\":\"$SID\"}" >/dev/null
echo "✓ student $SID in class $CID"

rec(){ curl -sf -b "$M" -X POST "$API/api/students/$SID/recitations" -H 'Content-Type: application/json' -d "$1"; }

step "Full surah 112 (الإخلاص 1-4) excellent → full/excellent"
rec '{"surahNumber":112,"fromAyah":1,"toAyah":4,"rating":"excellent"}' || fail "rec 112"
step "Partial surah 2 (البقرة 1-10) good → partial"
rec '{"surahNumber":2,"fromAyah":1,"toAyah":10,"rating":"good"}' || fail "rec 2"
step "Surah 1: first 1-5 weak, then 1-7 excellent → full, latest=excellent"
rec '{"surahNumber":1,"fromAyah":1,"toAyah":5,"rating":"weak"}' || fail "rec 1a"
rec '{"surahNumber":1,"fromAyah":1,"toAyah":7,"rating":"excellent"}' || fail "rec 1b"

step "Invalid range surah 112 to_ayah=5 (>4) rejected (400)"
c=$(code -b "$M" -X POST "$API/api/students/$SID/recitations" -H 'Content-Type: application/json' -d '{"surahNumber":112,"fromAyah":1,"toAyah":5,"rating":"good"}')
[ "$c" = 400 ] || fail "expected 400, got $c"
echo "✓ invalid ayah range rejected"

step "Student recitation: summary + heart"
R=$(curl -sf -b "$M" "$API/api/students/$SID/recitations")
echo "  summary: $(echo "$R" | json "d['summary']")"
[ "$(echo "$R" | json "d['summary']['fullCount']")" = 2 ] || fail "fullCount should be 2"
[ "$(echo "$R" | json "d['summary']['partialCount']")" = 1 ] || fail "partialCount should be 1"
[ "$(echo "$R" | json "d['summary']['totalRecitations']")" = 4 ] || fail "total should be 4"
# Surah 1 cell: status full, rating excellent (latest)
[ "$(echo "$R" | json "next(c['status'] for c in d['heart'] if c['number']==1)")" = full ] || fail "surah1 status"
[ "$(echo "$R" | json "next(c['rating'] for c in d['heart'] if c['number']==1)")" = excellent ] || fail "surah1 latest rating"
# Surah 2 cell: partial
[ "$(echo "$R" | json "next(c['status'] for c in d['heart'] if c['number']==2)")" = partial ] || fail "surah2 status"
# Surah 112: full/excellent
[ "$(echo "$R" | json "next(c['status'] for c in d['heart'] if c['number']==112)")" = full ] || fail "surah112 status"
# Surah 3 (untouched): none
[ "$(echo "$R" | json "next(c['status'] for c in d['heart'] if c['number']==3)")" = none ] || fail "surah3 none"
echo "✓ heart: surah1=full/excellent (latest), surah2=partial, surah112=full, surah3=none"

step "Class recitation log shows the student's entries"
CL=$(curl -sf -b "$M" "$API/api/classes/$CID/recitations")
N=$(echo "$CL" | json "len(d['log'])")
[ "$N" = 4 ] || fail "class log should have 4 entries, got $N"
[ "$(echo "$CL" | json "d['log'][0]['studentName'] is not None")" = True ] || fail "class log should include studentName"
echo "✓ class log has $N entries with student names"

echo; echo "═══ SPEC 005 CHECKS PASSED ═══"
