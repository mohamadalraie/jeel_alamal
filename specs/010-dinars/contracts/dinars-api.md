# API Contract — Dinars (نظام الدنانير)

All routes require authentication (JWT cookie). Institute is derived server-side from
the target resource/actor — never sent by the client. Errors use the standard envelope
`{ success, statusCode, message, timestamp, path }`. Roles: **M** = institute_manager
(or super_admin), **T** = teacher, **S** = student.

---

## Rules configuration (manager)

### `GET /api/institutes/:instituteId/dinar-rules` — **M**
Lazily seeds the 9 system rules if missing, then returns the full catalogue.
```
200 → {
  manual: DinarRuleView[];          // manager-created, context lesson|recitation
  system: DinarRuleView[];          // 9 seeded rules (attendance + recitation), by fixed order
}
DinarRuleView = {
  id, name, amount, context, trigger, systemKey|null,
  isActive, isProtected, createdAt
}
```

### `POST /api/institutes/:instituteId/dinar-rules` — **M**
```
body → { name: string(≤100), amount: int(≠0), context: 'lesson'|'recitation' }
201 → DinarRuleView
```

### `PATCH /api/dinar-rules/:ruleId` — **M**
Rename / re-value / activate. Allowed on protected (system) rules for `amount`+`isActive`
only; `name`/`context` changes rejected for protected rules.
```
body → { name?, amount?, isActive? }
200 → DinarRuleView
```

### `DELETE /api/dinar-rules/:ruleId` — **M**
```
204 → (no content)
409 → rule is protected (system) OR has transaction history  (deactivate instead)
```

---

## Awarding (teacher / manager)

### `POST /api/students/:studentId/dinars` — **T** (own class) / **M**
Single award — rule or exceptional. `context` defaults to `general`; the lesson timer
sends `lesson`.
```
body (rule)        → { ruleId: uuid, context?: 'lesson'|'recitation'|'general' }
body (exceptional) → { amount: int(≠0), reason: string(1..200), context?: ... }
201 → DinarLedgerItem
403 → actor may not award this student
```

### `POST /api/dinars/bulk` — **T** (own class) / **M**
One rule → many students in a class (one transaction each).
```
body → { studentIds: uuid[], ruleId: uuid, context?: 'lesson'|'recitation'|'general' }
        // OR exceptional: { studentIds, amount, reason, context? }
201 → { awarded: number }
403 → actor may not award one or more of the students
```

### `POST /api/dinars/:transactionId/reverse` — author **T** / **M**
Creates a compensating entry; blocks if already reversed or automatic.
```
201 → DinarLedgerItem   // the compensating entry
409 → already reversed OR automatic (attendance/recitation) transaction
403 → not the author and not a manager
```

---

## Student view

### `GET /api/students/:studentId/dinars` — **S** (self) / staff
```
200 → {
  summary: { net: int, positive: int, negative: int, count: int },
  ledger: DinarLedgerItem[]      // newest-first
}
DinarLedgerItem = {
  id, amount, context, sourceType,
  label: string,                 // ruleName or reason
  awardedByName: string|null,
  reversedAt: string|null,
  createdAt: string
}
```

---

## Leaderboard (staff)

### `GET /api/institutes/:instituteId/dinar-leaderboard` — **M** (institute or any class) / **T** (own classes only)
```
query → ?classId=<uuid>   (optional; omit for institute-wide — managers only)
200 → { scope: 'institute'|'class', rows: DinarLeaderboardRow[] }
DinarLeaderboardRow = { rank: int, studentId, name, balance: int }   // ties share rank
403 → teacher requesting institute-wide or a class they don't teach
```

---

## Internal (module-to-module, not HTTP)

Called after the source module persists its data — no controller route:
- `SyncAttendanceDinarsUseCase.execute(actor, { instituteId, classId, date, entries, takenBy })`
  — invoked by `TakeAttendanceUseCase`.
- `ApplyRecitationDinarUseCase.execute({ instituteId, studentId, recitationId, rating, recitedBy })`
  — invoked by `AddRecitationUseCase`.

Both are idempotent and reconcile projections per `data-model.md`.
