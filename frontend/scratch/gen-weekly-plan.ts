import { readFileSync, writeFileSync } from 'fs';

const template = readFileSync('src/features/classes/weekly-plan.tsx', 'utf8');

let newFile = template.replace(/export function WeeklyPlan/g, 'export function InstituteWeeklyPlan');

// Replace the fetch call safely without template literal issues in bash/powershell
newFile = newFile.replace(
  'fetch(`${API_BASE}/classes/${classId}/weekly-plan?weekStart=${weekStartStr}`',
  'fetch(`${API_BASE}/institutes/${instituteId}/weekly-plan?weekStart=${weekStartStr}`'
);

// Remove classId prop
newFile = newFile.replace(/classId: string;/g, '');
newFile = newFile.replace(/classId,/g, '');

// Display the class name in the slots
newFile = newFile.replace(
  '<span className="truncate">{teacherName}</span>',
  '<span className="truncate">{teacherName}</span>\n                          </div>\n                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-1">\n                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">{slot.className ?? \'بدون حلقة\'}</span>'
);

// We need to pass the preselectClassId dynamically based on the slot for the pending slots
newFile = newFile.replace(
  /preselectClassId=\{[^\}]+\}/,
  'preselectClassId={selectedSlot?.classId}'
);
newFile = newFile.replace(
  /classId, teacherId:/,
  'classId: slot.classId || "", teacherId:'
);

writeFileSync('src/features/lessons/institute-weekly-plan.tsx', newFile);
console.log('Created institute-weekly-plan.tsx successfully.');
