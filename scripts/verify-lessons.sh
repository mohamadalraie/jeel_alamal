#!/usr/bin/env bash
# Spec 008 — lessons program E2E check against the LIVE stack.
# No data wipe; uses unique-suffixed test data and cleans up after itself.
set -euo pipefail

export PYTHONIOENCODING=utf-8
API="${API:-http://localhost:3001}"
J="$(mktemp)"; TJ="$(mktemp)"
SUF="$RANDOM$RANDOM"
pass(){ echo "  ✓ $1"; }
fail(){ echo "  ✗ $1"; exit 1; }
jq_py(){ python -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

echo "== login admin =="
curl -s -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}' -c "$J" -b "$J" >/dev/null
INST=$(curl -s "$API/api/institutes" -b "$J" | jq_py "d[0]['id']")
CLASSES=$(curl -s "$API/api/institutes/$INST/classes" -b "$J")
C1=$(echo "$CLASSES" | jq_py "d[0]['id']")
C2=$(echo "$CLASSES" | jq_py "d[1]['id'] if len(d)>1 else ''")
TMP_CLASS=""
if [ -z "$C2" ]; then
  C2=$(curl -s -X POST "$API/api/institutes/$INST/classes" -b "$J" -H 'Content-Type: application/json' \
    -d "{\"name\":\"حلقة اختبار $SUF\"}" | jq_py "d['id']")
  TMP_CLASS="$C2"
fi
pass "institute=$INST classes=$C1,$C2"

echo "== create two teachers =="
mk_teacher(){ curl -s -X POST "$API/api/institutes/$INST/teachers" -b "$J" -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"T\",\"lastName\":\"$1\",\"birthDate\":\"1990-01-01\",\"phone\":\"0590000000\",\"username\":\"vt_${1}_$SUF\",\"password\":\"Teacher@123\"}" | jq_py "d['id']"; }
TA=$(mk_teacher A); TB=$(mk_teacher B)
pass "teachers TA=$TA TB=$TB"

echo "== category =="
CAT=$(curl -s -X POST "$API/api/institutes/$INST/lesson-categories" -b "$J" -H 'Content-Type: application/json' \
  -d '{"name":"فقه","color":"#BE9B5F"}' | jq_py "d['id']")
[ -n "$CAT" ] && pass "category=$CAT" || fail "category"

echo "== multi-class lesson (C1->TA, C2->TB) with a link source =="
LID=$(curl -s -X POST "$API/api/institutes/$INST/lessons" -b "$J" -H 'Content-Type: application/json' \
  -d "{\"kind\":\"lesson\",\"name\":\"درس E2E\",\"description\":\"وصف\",\"categoryId\":\"$CAT\",\"date\":\"2026-07-05\",\"sources\":[{\"kind\":\"link\",\"url\":\"https://e.com\",\"description\":\"رابط\"}],\"assignments\":[{\"classId\":\"$C1\",\"teacherId\":\"$TA\"},{\"classId\":\"$C2\",\"teacherId\":\"$TB\"}]}" | jq_py "d['lessonId']")
[ -n "$LID" ] && pass "lesson=$LID" || fail "create lesson"

echo "== class C1 program shows it with TA + source =="
P1=$(curl -s "$API/api/classes/$C1/lessons" -b "$J")
echo "$P1" | jq_py "1 if any(e['lessonId']=='$LID' and e['teacher']['id']=='$TA' and len(e['sources'])==1 for e in d['entries']) else fail" 2>/dev/null \
  && pass "C1 has lesson w/ TA + source" || fail "C1 program"

echo "== edit shared name once -> reflected in BOTH classes =="
EDITED="EDITED-$SUF"
curl -s -o /dev/null -X PATCH "$API/api/lessons/$LID" -b "$J" -H 'Content-Type: application/json' -d "{\"name\":\"$EDITED\"}"
N1=$(curl -s "$API/api/classes/$C1/lessons" -b "$J" | jq_py "next(e['name'] for e in d['entries'] if e['lessonId']=='$LID')=='$EDITED'")
N2=$(curl -s "$API/api/classes/$C2/lessons" -b "$J" | jq_py "next(e['name'] for e in d['entries'] if e['lessonId']=='$LID')=='$EDITED'")
[ "$N1" = "True" ] && [ "$N2" = "True" ] && pass "edit reflected in both (no duplication)" || fail "shared edit (C1=$N1 C2=$N2)"

echo "== teacher TA feed shows the lesson, next-flagged =="
curl -s -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"vt_A_$SUF\",\"password\":\"Teacher@123\"}" -c "$TJ" >/dev/null
curl -s "$API/api/lessons/mine" -b "$TJ" | jq_py "1 if any(e['lessonId']=='$LID' for e in d['entries']) else fail" 2>/dev/null \
  && pass "teacher feed ok" || fail "teacher feed"

echo "== recitation entry (field-less) =="
RID=$(curl -s -X POST "$API/api/institutes/$INST/lessons" -b "$J" -H 'Content-Type: application/json' \
  -d "{\"kind\":\"recitation\",\"date\":\"2026-07-06\",\"assignments\":[{\"classId\":\"$C1\",\"teacherId\":\"$TA\"}]}" | jq_py "d['lessonId']")
curl -s "$API/api/classes/$C1/lessons" -b "$J" | jq_py "1 if any(e['lessonId']=='$RID' and e['kind']=='recitation' and e['name'] is None for e in d['entries']) else fail" 2>/dev/null \
  && pass "recitation entry ok" || fail "recitation"

echo "== student visibility toggle =="
curl -s -o /dev/null -X PUT "$API/api/classes/$C1/lessons-visibility" -b "$J" -H 'Content-Type: application/json' -d '{"visible":true}'
curl -s "$API/api/classes/$C1" -b "$J" | jq_py "1 if d['class']['lessonsVisibleToStudents'] else fail" 2>/dev/null \
  && pass "visibility on" || fail "visibility"

echo "== CLEANUP =="
for L in $LID $RID; do curl -s -o /dev/null -X DELETE "$API/api/lessons/$L" -b "$J"; done
curl -s -o /dev/null -X DELETE "$API/api/lesson-categories/$CAT" -b "$J"
curl -s -o /dev/null -X PUT "$API/api/classes/$C1/lessons-visibility" -b "$J" -H 'Content-Type: application/json' -d '{"visible":false}'
for TT in $TA $TB; do curl -s -o /dev/null -X DELETE "$API/api/institutes/$INST/members/$TT" -b "$J"; done
[ -n "$TMP_CLASS" ] && curl -s -o /dev/null -X DELETE "$API/api/classes/$TMP_CLASS" -b "$J"
pass "cleaned up"
echo "ALL LESSONS CHECKS PASSED ✓"
