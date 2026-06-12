#!/usr/bin/env bash
# End-to-end verification of spec 001 (core tenancy scenario) against a
# running dev stack. Uses cookie jars per actor. Exits non-zero on failure.
# Re-runnable: usernames carry a per-run suffix so they never collide.
set -euo pipefail

API=${API:-http://localhost:3001}
RUN=$(date +%s)
MGR_USER="manager.damascus.$RUN"
TCH_USER="teacher.ahmad.$RUN"
STU_USER="student.sara.$RUN"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
SA="$TMP/sa.jar"; MGR="$TMP/mgr.jar"; TCH="$TMP/tch.jar"; SJ="$TMP/st.jar"

step() { echo; echo "── $1"; }
fail() { echo "✗ FAILED: $1" >&2; exit 1; }
json() { python -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null \
  || node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=JSON.parse(s);console.log(eval('d$1'))})"; }

step "1. Unauthenticated request is denied (deny by default)"
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/institutes")
[ "$code" = 401 ] || fail "expected 401, got $code"
echo "✓ 401 without auth"

step "2. Super admin logs in (username/password)"
curl -sf -c "$SA" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' >/dev/null || fail "super admin login"
echo "✓ super admin logged in"

step "3. Super admin creates institute + manager (atomic)"
RES=$(curl -sf -b "$SA" -X POST "$API/api/institutes" -H 'Content-Type: application/json' -d "{
  \"name\":\"معهد جيل العمل - دمشق\",\"place\":\"دمشق - المزة\",\"description\":\"المعهد الأول\",
  \"manager\":{\"firstName\":\"محمد\",\"lastName\":\"المدير\",\"birthDate\":\"1988-03-15\",
             \"phone\":\"+963911111111\",\"username\":\"$MGR_USER\",\"password\":\"Manager123!\"}}") \
  || fail "create institute"
INST=$(echo "$RES" | json "['institute']['id']")
echo "✓ institute created: $INST"

step "4. Manager cannot create institutes (403, not a validation 400)"
curl -s -c "$MGR" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$MGR_USER\",\"password\":\"Manager123!\"}" >/dev/null
code=$(curl -s -b "$MGR" -o /dev/null -w '%{http_code}' -X POST "$API/api/institutes" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Forbidden Institute\",\"place\":\"Nowhere\",\"manager\":{\"firstName\":\"Should\",\"lastName\":\"Fail\",\"birthDate\":\"1990-01-01\",\"phone\":\"+963900000001\",\"username\":\"shouldfail.$RUN\",\"password\":\"password1\"}}")
[ "$code" = 403 ] || fail "expected 403, got $code"
echo "✓ manager denied institute creation"

step "5. Manager sees only assigned institutes"
COUNT=$(curl -sf -b "$MGR" "$API/api/institutes" | json ".__len__()")
[ "$COUNT" = 1 ] || fail "expected 1 institute, got $COUNT"
echo "✓ manager sees exactly 1 (their own)"

step "6. Manager creates a teacher and a student"
T=$(curl -sf -b "$MGR" -X POST "$API/api/institutes/$INST/teachers" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"أحمد\",\"lastName\":\"الأستاذ\",\"birthDate\":\"1992-07-01\",\"phone\":\"+963922222222\",\"username\":\"$TCH_USER\",\"password\":\"Teacher123!\"}") || fail "create teacher"
TID=$(echo "$T" | json "['id']")
S=$(curl -sf -b "$MGR" -X POST "$API/api/institutes/$INST/students" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"سارة\",\"lastName\":\"الطالبة\",\"birthDate\":\"2010-09-20\",\"phone\":\"+963933333333\",\"schoolGrade\":\"الصف الخامس\",\"username\":\"$STU_USER\",\"password\":\"Student123!\"}") || fail "create student"
SID=$(echo "$S" | json "['id']")
echo "✓ teacher $TID / student $SID"

step "7. Manager creates a class (حلقة), adds teacher, sets supervisor"
C=$(curl -sf -b "$MGR" -X POST "$API/api/institutes/$INST/classes" -H 'Content-Type: application/json' \
  -d "{\"name\":\"حلقة الفجر\",\"description\":\"حلقة تحفيظ الصباح\"}") || fail "create class"
CID=$(echo "$C" | json "['id']")
curl -sf -b "$MGR" -X POST "$API/api/classes/$CID/teachers" -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$TID\"}" || fail "add class teacher"
curl -sf -b "$MGR" -X PUT "$API/api/classes/$CID/supervisor" -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$TID\"}" || fail "set supervisor"
echo "✓ class $CID with supervisor"

step "8. TEACHER (not manager) enrolls the student in their class"
curl -s -c "$TCH" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$TCH_USER\",\"password\":\"Teacher123!\"}" >/dev/null
curl -sf -b "$TCH" -X POST "$API/api/classes/$CID/students" -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$SID\"}" || fail "teacher enroll"
echo "✓ teacher enrolled the student"

step "9. Student login works; student cannot list teachers (403)"
curl -sf -c "$SJ" -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$STU_USER\",\"password\":\"Student123!\"}" >/dev/null || fail "student login"
code=$(curl -s -b "$SJ" -o /dev/null -w '%{http_code}' "$API/api/institutes/$INST/teachers")
[ "$code" = 403 ] || fail "expected 403 for student, got $code"
echo "✓ student authenticated but tenant-restricted"

step "10. Final class state (one supervisor, one student enrolled)"
curl -sf -b "$MGR" "$API/api/institutes/$INST/classes"
echo
echo "═══ ALL CHECKS PASSED ═══"
