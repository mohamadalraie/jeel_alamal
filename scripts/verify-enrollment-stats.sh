#!/usr/bin/env bash
# E2E verification of spec 004 (soft delete, prayer schedule, unassigned, stats).
set -euo pipefail

API=${API:-http://localhost:3001}
RUN=$(date +%s)
MGR="mgr4.$RUN"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SA="$TMP/sa"; M="$TMP/m"

step(){ echo; echo "── $1"; }
fail(){ echo "✗ FAILED: $1" >&2; exit 1; }
json(){ python -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

step "Provision institute + manager"
curl -sf -c "$SA" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' >/dev/null || fail "admin login"
INST=$(curl -sf -b "$SA" -X POST "$API/api/institutes" -H 'Content-Type: application/json' \
  -d "{\"name\":\"معهد 004\",\"place\":\"حماة\",\"manager\":{\"firstName\":\"م\",\"lastName\":\"٤\",\"birthDate\":\"1980-01-01\",\"phone\":\"+963900000004\",\"username\":\"$MGR\",\"password\":\"Manager123!\"}}" | json "d['institute']['id']")
curl -sf -c "$M" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$MGR\",\"password\":\"Manager123!\"}" >/dev/null
echo "✓ institute $INST"

mk_student(){ curl -sf -b "$M" -X POST "$API/api/institutes/$INST/students" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"$1\",\"lastName\":\"ط\",\"birthDate\":\"2010-01-01\",\"phone\":\"+963933333333\",\"schoolGrade\":\"g6\",\"username\":\"$1.$RUN\",\"password\":\"Student123!\"}" | json "d['id']"; }
mk_teacher(){ curl -sf -b "$M" -X POST "$API/api/institutes/$INST/teachers" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"$1\",\"lastName\":\"أ\",\"birthDate\":\"1990-01-01\",\"phone\":\"+963922222222\",\"username\":\"$1.$RUN\",\"password\":\"Teacher123!\"}" | json "d['id']"; }

step "Create 2 students + 1 teacher + class"
S1=$(mk_student s1); S2=$(mk_student s2); T1=$(mk_teacher t1)
CID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/classes" -H 'Content-Type: application/json' -d '{"name":"حلقة ٤"}' | json "d['id']")
echo "✓ s1=$S1 s2=$S2 t1=$T1 class=$CID"

step "Unassigned students = 2 (none enrolled yet)"
N=$(curl -sf -b "$M" "$API/api/institutes/$INST/unassigned-students" | json "len(d)")
[ "$N" = 2 ] || fail "expected 2 unassigned, got $N"
echo "✓ unassigned=$N"

step "Enroll s1 → unassigned drops to 1"
curl -sf -b "$M" -X POST "$API/api/classes/$CID/students" -H 'Content-Type: application/json' -d "{\"userId\":\"$S1\"}" >/dev/null
N=$(curl -sf -b "$M" "$API/api/institutes/$INST/unassigned-students" | json "len(d)")
[ "$N" = 1 ] || fail "expected 1 unassigned, got $N"
echo "✓ unassigned=$N (s1 hidden)"

step "Prayer-aware schedule: between dhuhr→asr, and after maghrib (no end)"
curl -sf -b "$M" -X PUT "$API/api/classes/$CID/schedule" -H 'Content-Type: application/json' -d '{"slots":[
  {"dayOfWeek":"sat","start":{"kind":"prayer","value":"dhuhr"},"end":{"kind":"prayer","value":"asr"}},
  {"dayOfWeek":"mon","start":{"kind":"prayer","value":"maghrib"}},
  {"dayOfWeek":"wed","start":{"kind":"time","value":"08:00"},"end":{"kind":"prayer","value":"dhuhr"}}
]}' || fail "set schedule"
SLOTS=$(curl -sf -b "$M" "$API/api/classes/$CID" | json "len(d['schedule'])")
NOEND=$(curl -sf -b "$M" "$API/api/classes/$CID" | json "len([s for s in d['schedule'] if s['end'] is None])")
[ "$SLOTS" = 3 ] || fail "expected 3 slots, got $SLOTS"
[ "$NOEND" = 1 ] || fail "expected 1 slot with no end, got $NOEND"
echo "✓ schedule: $SLOTS slots, $NOEND with no end"

step "Invalid prayer rejected (400)"
c=$(code -b "$M" -X PUT "$API/api/classes/$CID/schedule" -H 'Content-Type: application/json' \
  -d '{"slots":[{"dayOfWeek":"sat","start":{"kind":"prayer","value":"lunch"}}]}')
[ "$c" = 400 ] || fail "invalid prayer expected 400, got $c"
echo "✓ invalid prayer rejected"

step "Statistics counts (employees=1, teachers=1, students=2, classes=1)"
ST=$(curl -sf -b "$M" "$API/api/institutes/$INST/stats")
echo "  $ST"
[ "$(echo "$ST" | json "d['employees']")" = 1 ] || fail "employees"
[ "$(echo "$ST" | json "d['teachers']")" = 1 ] || fail "teachers"
[ "$(echo "$ST" | json "d['students']")" = 2 ] || fail "students"
[ "$(echo "$ST" | json "d['classes']")" = 1 ] || fail "classes"
echo "✓ stats correct"

step "Soft-delete s2 → hidden from students list + stats drops to 1"
curl -sf -b "$M" -X DELETE "$API/api/institutes/$INST/members/$S2" || fail "soft delete"
LISTED=$(curl -sf -b "$M" "$API/api/institutes/$INST/students" | json "len(d)")
STUD=$(curl -sf -b "$M" "$API/api/institutes/$INST/stats" | json "d['students']")
[ "$LISTED" = 1 ] || fail "expected 1 listed student, got $LISTED"
[ "$STUD" = 1 ] || fail "expected stats students=1, got $STUD"
echo "✓ soft-deleted student hidden (listed=$LISTED, stats=$STUD)"

step "Soft-deleted student cannot log in (401)"
c=$(code -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"username\":\"s2.$RUN\",\"password\":\"Student123!\"}")
[ "$c" = 401 ] || fail "deleted login expected 401, got $c"
echo "✓ deleted account cannot log in"

step "Soft-delete enrolled s1 → removed from class membership too"
curl -sf -b "$M" -X DELETE "$API/api/institutes/$INST/members/$S1" || fail "soft delete s1"
CN=$(curl -sf -b "$M" "$API/api/classes/$CID" | json "len(d['students'])")
[ "$CN" = 0 ] || fail "expected class to have 0 students, got $CN"
echo "✓ enrolled student detached from class on delete"

echo; echo "═══ SPEC 004 CHECKS PASSED ═══"
