#!/usr/bin/env bash
# E2E verification of spec 002 (profiles + permissions) on a running dev stack.
set -euo pipefail

API=${API:-http://localhost:3001}
RUN=$(date +%s)
MGR="manager.$RUN"; TCH="teacher.$RUN"; STU="student.$RUN"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SA="$TMP/sa"; M="$TMP/m"; T="$TMP/t"; S="$TMP/s"

step(){ echo; echo "── $1"; }
fail(){ echo "✗ FAILED: $1" >&2; exit 1; }
json(){ python -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

step "Login super admin & provision an institute + manager"
curl -sf -c "$SA" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' >/dev/null || fail "admin login"
INST=$(curl -sf -b "$SA" -X POST "$API/api/institutes" -H 'Content-Type: application/json' \
  -d "{\"name\":\"معهد 002\",\"place\":\"دمشق\",\"manager\":{\"firstName\":\"مدير\",\"lastName\":\"٢\",\"birthDate\":\"1985-01-01\",\"phone\":\"+963900000000\",\"username\":\"$MGR\",\"password\":\"Manager123!\"}}" | json "['institute']['id']")
curl -sf -c "$M" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$MGR\",\"password\":\"Manager123!\"}" >/dev/null
echo "✓ institute $INST"

step "Validation: future birth date is rejected (400)"
c=$(code -b "$M" -X POST "$API/api/institutes/$INST/teachers" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"X\",\"lastName\":\"Y\",\"birthDate\":\"2999-01-01\",\"phone\":\"+963911111111\",\"username\":\"future.$RUN\",\"password\":\"password1\"}")
[ "$c" = 400 ] || fail "future birthdate expected 400, got $c"
echo "✓ future birth date rejected"

step "Validation: bad phone is rejected (400)"
c=$(code -b "$M" -X POST "$API/api/institutes/$INST/teachers" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"X\",\"lastName\":\"Y\",\"birthDate\":\"1990-01-01\",\"phone\":\"abc\",\"username\":\"badphone.$RUN\",\"password\":\"password1\"}")
[ "$c" = 400 ] || fail "bad phone expected 400, got $c"
echo "✓ bad phone rejected"

step "Create teacher + student"
TID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/teachers" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"أحمد\",\"lastName\":\"م\",\"birthDate\":\"1990-05-01\",\"phone\":\"+963922222222\",\"username\":\"$TCH\",\"password\":\"Teacher123!\"}" | json "['id']")
SID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/students" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"سارة\",\"lastName\":\"ط\",\"birthDate\":\"2011-03-03\",\"phone\":\"+963933333333\",\"schoolGrade\":\"الخامس\",\"username\":\"$STU\",\"password\":\"Student123!\"}" | json "['id']")
curl -sf -c "$T" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$TCH\",\"password\":\"Teacher123!\"}" >/dev/null
curl -sf -c "$S" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$STU\",\"password\":\"Student123!\"}" >/dev/null
echo "✓ teacher $TID / student $SID"

step "Manager sets teacher extended details + certification"
curl -sf -b "$M" -X PATCH "$API/api/institutes/$INST/teachers/$TID/details" -H 'Content-Type: application/json' \
  -d '{"studyDegree":"master","studyField":"الشريعة","quranPartsMemorized":15,"tajweedLevel":"excellent"}' || fail "set details"
curl -sf -b "$M" -X POST "$API/api/institutes/$INST/teachers/$TID/certifications" -H 'Content-Type: application/json' \
  -d '{"title":"دورة المتقن"}' >/dev/null || fail "add cert"
DEG=$(curl -sf -b "$M" "$API/api/institutes/$INST/teachers/$TID" | json "['teacher']['teacherDetails']['studyDegree']")
[ "$DEG" = master ] || fail "expected master, got $DEG"
echo "✓ details + certification saved (degree=$DEG)"

step "Teacher viewing own profile gets NO extended details (stripped)"
BODY=$(curl -sf -b "$T" "$API/api/institutes/$INST/teachers/$TID")
echo "$BODY" | grep -q 'teacherDetails' && fail "teacher should not see extended details"
echo "✓ extended details hidden from teacher"

step "Quran parts out of range (>30) rejected (400)"
c=$(code -b "$M" -X PATCH "$API/api/institutes/$INST/teachers/$TID/details" -H 'Content-Type: application/json' -d '{"quranPartsMemorized":40}')
[ "$c" = 400 ] || fail "quran>30 expected 400, got $c"
echo "✓ quran parts range enforced"

step "Notes: manager adds a note (author recorded)"
NID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/students/$SID/notes" -H 'Content-Type: application/json' \
  -d '{"body":"طالبة مجتهدة"}' | json "['id']")
AUTHOR=$(curl -sf -b "$M" "$API/api/institutes/$INST/students/$SID/notes" | json "[0]['authorName']")
echo "✓ note $NID by $AUTHOR"

step "Student CANNOT read notes (403) — notes never visible to students"
c=$(code -b "$S" "$API/api/institutes/$INST/students/$SID/notes")
[ "$c" = 403 ] || fail "student notes expected 403, got $c"
echo "✓ notes hidden from student"

step "Change student class (transfer)"
CID=$(curl -sf -b "$M" -X POST "$API/api/institutes/$INST/classes" -H 'Content-Type: application/json' \
  -d '{"name":"حلقة أ"}' | json "['id']")
curl -sf -b "$M" -X PUT "$API/api/institutes/$INST/students/$SID/class" -H 'Content-Type: application/json' \
  -d "{\"classId\":\"$CID\"}" || fail "change class"
CUR=$(curl -sf -b "$M" "$API/api/institutes/$INST/students/$SID" | json "['currentClass']['id']")
[ "$CUR" = "$CID" ] || fail "expected current class $CID, got $CUR"
echo "✓ student transferred to $CUR"

step "Teacher can edit student details (staff)"
curl -sf -b "$T" -X PATCH "$API/api/institutes/$INST/students/$SID" -H 'Content-Type: application/json' \
  -d '{"firstName":"سارة","lastName":"ط","birthDate":"2011-03-03","phone":"+963939999999","schoolGrade":"السادس"}' || fail "teacher edit student"
echo "✓ teacher edited student"

step "Delete the teacher (manager)"
curl -sf -b "$M" -X DELETE "$API/api/institutes/$INST/members/$TID" || fail "delete teacher"
c=$(code -b "$M" "$API/api/institutes/$INST/teachers/$TID")
[ "$c" = 404 ] || fail "deleted teacher expected 404, got $c"
echo "✓ teacher deleted"

echo; echo "═══ SPEC 002 CHECKS PASSED ═══"
