#!/usr/bin/env bash
# E2E verification of spec 003 (class profile, schedule, CRUD, grade, institute update).
set -euo pipefail

API=${API:-http://localhost:3001}
RUN=$(date +%s)
MGR="mgr3.$RUN"; TCH="tch3.$RUN"; STU="stu3.$RUN"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SA="$TMP/sa"; M="$TMP/m"

step(){ echo; echo "── $1"; }
fail(){ echo "✗ FAILED: $1" >&2; exit 1; }
json(){ python -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

step "Provision institute + manager (super admin)"
curl -sf -c "$SA" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' >/dev/null || fail "admin login"
INST=$(curl -sf -b "$SA" -X POST "$API/api/institutes" -H 'Content-Type: application/json' \
  -d "{\"name\":\"معهد 003\",\"place\":\"حلب\",\"manager\":{\"firstName\":\"مدير\",\"lastName\":\"٣\",\"birthDate\":\"1980-01-01\",\"phone\":\"+963900000003\",\"username\":\"$MGR\",\"password\":\"Manager123!\"}}" | json "d['institute']['id']")
curl -sf -c "$M" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$MGR\",\"password\":\"Manager123!\"}" >/dev/null
echo "✓ institute $INST"

step "Super admin updates institute logo (relative /uploads path accepted)"
LOGO=$(curl -sf -b "$SA" -X PATCH "$API/api/institutes/$INST" -H 'Content-Type: application/json' \
  -d '{"name":"معهد 003","place":"حلب","logoUrl":"/uploads/test-logo.png"}' | json "d['logoUrl']")
[ "$LOGO" = "/uploads/test-logo.png" ] || fail "logo not saved, got $LOGO"
echo "✓ institute logo updated → $LOGO"

step "Create teacher; create student with grade g12 (البكالوريا)"
TID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/teachers" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"أ\",\"lastName\":\"ب\",\"birthDate\":\"1990-01-01\",\"phone\":\"+963922222222\",\"username\":\"$TCH\",\"password\":\"Teacher123!\"}" | json "d['id']")
SID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/students" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"ج\",\"lastName\":\"د\",\"birthDate\":\"2008-01-01\",\"phone\":\"+963933333333\",\"schoolGrade\":\"g12\",\"username\":\"$STU\",\"password\":\"Student123!\"}" | json "d['id']")
echo "✓ teacher $TID / student $SID (grade g12)"

step "Invalid grade rejected (400)"
c=$(code -b "$M" -X POST "$API/api/institutes/$INST/students" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"x\",\"lastName\":\"y\",\"birthDate\":\"2008-01-01\",\"phone\":\"+963900000009\",\"schoolGrade\":\"g99\",\"username\":\"badgrade.$RUN\",\"password\":\"password1\"}")
[ "$c" = 400 ] || fail "invalid grade expected 400, got $c"
echo "✓ invalid grade rejected"

step "Create class; add teacher; set supervisor; enroll student"
CID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/classes" -H 'Content-Type: application/json' \
  -d '{"name":"حلقة 003","description":"وصف"}' | json "d['id']")
curl -sf -b "$M" -X POST "$API/api/classes/$CID/teachers" -H 'Content-Type: application/json' -d "{\"userId\":\"$TID\"}" || fail "add teacher"
curl -sf -b "$M" -X PUT "$API/api/classes/$CID/supervisor" -H 'Content-Type: application/json' -d "{\"userId\":\"$TID\"}" || fail "supervisor"
curl -sf -b "$M" -X POST "$API/api/classes/$CID/students" -H 'Content-Type: application/json' -d "{\"userId\":\"$SID\"}" || fail "enroll"
echo "✓ class $CID populated"

step "Class profile aggregates members + names"
PROF=$(curl -sf -b "$M" "$API/api/classes/$CID")
SUP=$(echo "$PROF" | json "d['teachers'][0]['isSupervisor']")
NST=$(echo "$PROF" | json "len(d['students'])")
[ "$SUP" = True ] || fail "supervisor flag expected True, got $SUP"
[ "$NST" = 1 ] || fail "expected 1 student, got $NST"
echo "✓ profile: supervisor=$SUP students=$NST"

step "Set weekly schedule (attendance times)"
curl -sf -b "$M" -X PUT "$API/api/classes/$CID/schedule" -H 'Content-Type: application/json' \
  -d '{"slots":[{"dayOfWeek":"sat","startTime":"16:00","endTime":"17:30"},{"dayOfWeek":"mon","startTime":"16:00","endTime":"17:30"}]}' || fail "set schedule"
NSLOTS=$(curl -sf -b "$M" "$API/api/classes/$CID" | json "len(d['schedule'])")
[ "$NSLOTS" = 2 ] || fail "expected 2 slots, got $NSLOTS"
echo "✓ schedule has $NSLOTS slots"

step "Invalid schedule (end before start) rejected (400)"
c=$(code -b "$M" -X PUT "$API/api/classes/$CID/schedule" -H 'Content-Type: application/json' \
  -d '{"slots":[{"dayOfWeek":"sat","startTime":"18:00","endTime":"17:00"}]}')
[ "$c" = 400 ] || fail "bad schedule expected 400, got $c"
echo "✓ invalid schedule rejected"

step "Remove teacher + student from class"
curl -sf -b "$M" -X DELETE "$API/api/classes/$CID/students/$SID" || fail "remove student"
curl -sf -b "$M" -X DELETE "$API/api/classes/$CID/teachers/$TID" || fail "remove teacher"
EMPTY=$(curl -sf -b "$M" "$API/api/classes/$CID" | json "len(d['teachers'])+len(d['students'])")
[ "$EMPTY" = 0 ] || fail "expected empty class, got $EMPTY"
echo "✓ members removed"

step "Update + delete class"
curl -sf -b "$M" -X PATCH "$API/api/classes/$CID" -H 'Content-Type: application/json' -d '{"name":"حلقة محدثة"}' || fail "update class"
curl -sf -b "$M" -X DELETE "$API/api/classes/$CID" || fail "delete class"
c=$(code -b "$M" "$API/api/classes/$CID")
[ "$c" = 404 ] || fail "deleted class expected 404, got $c"
echo "✓ class updated then deleted"

echo; echo "═══ SPEC 003 CHECKS PASSED ═══"
