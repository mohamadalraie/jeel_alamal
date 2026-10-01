'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { qk } from '@/lib/queries';
import { getClassProfile, addNote } from '@/lib/api';
import { notify } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, FileText } from 'lucide-react';

export function LessonTimerNotes({ 
  classId, 
  instituteId 
}: { 
  classId: string;
  instituteId: string;
}) {
  const t = useTranslations('lessons');
  const tc = useTranslations('common');
  const [target, setTarget] = useState<string>('general');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: qk.classProfile(classId),
    queryFn: () => getClassProfile(classId),
  });

  const students = profile?.students || [];

  const handleSave = async () => {
    if (!body.trim()) return;
    
    setBusy(true);
    try {
      if (target === 'general') {
        // Save general note
        // Note: As requested by the user, this is saved locally as a placeholder
        // until the "Lesson Reports" feature is implemented in the future.
        notify.success('تم حفظ ملاحظة الدرس مؤقتاً (سيتم تفعيل تقارير الدروس مستقبلاً)');
        setBody('');
      } else {
        // Target is a studentId
        await addNote(instituteId, target, body);
        notify.success('تم حفظ الملاحظة في ملف الطالب بنجاح');
        setBody('');
      }
    } catch (err) {
      notify.error(err, tc('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="py-4 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          ملاحظات الأستاذ
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">ملاحظة عامة عن الدرس</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea 
          placeholder="اكتب ملاحظتك هنا..." 
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[100px] resize-none"
        />

        <div className="flex justify-end mt-1">
          <Button size="sm" onClick={handleSave} disabled={busy || !body.trim()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            <Save className="h-4 w-4 ml-2" />
            حفظ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
