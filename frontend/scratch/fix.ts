import { readFileSync, writeFileSync } from 'fs';

let file = readFileSync('d:/jeel_alamal/frontend/src/features/lessons/institute-weekly-plan.tsx', 'utf8');

file = file.replace('export function InstituteWeeklyPlanView', 'export function InstituteWeeklyPlan');

// Add missing imports
if (!file.includes('Check,')) {
  file = file.replace(
    'import { ChevronRight, ChevronLeft, Plus, Calendar, Clock, BookOpen, CheckCircle2, User as UserIcon, BookMarked } from \'lucide-react\';',
    'import { ChevronRight, ChevronLeft, Plus, Calendar, Clock, BookOpen, CheckCircle2, User as UserIcon, BookMarked, Check, Trash2 } from \'lucide-react\';'
  );
}

if (!file.includes('createLesson')) {
  file = file.replace(
    'import { getWeeklyPlan, listLessonCategories } from \'@/lib/api\';',
    'import { getWeeklyPlan, listLessonCategories, createLesson } from \'@/lib/api\';\nimport { notify } from \'@/lib/toast\';'
  );
}

// Fix API_BASE reference
file = file.replace(/fetch\(`\$\{API_BASE\}\/institutes/g, 'fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/institutes');

// Fix `classId` in API call
file = file.replace(/const classId = ".*?";/g, ''); // we don't need classId
file = file.replace(/classId,/g, '');

writeFileSync('d:/jeel_alamal/frontend/src/features/lessons/institute-weekly-plan.tsx', file);
