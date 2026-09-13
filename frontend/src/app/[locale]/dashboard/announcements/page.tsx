'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { apiFetch, resolveAsset, uploadFile } from '@/lib/api';
import { useInstitute } from '@/features/layout/institute-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface Announcement {
  id: string;
  instituteId: string;
  authorId: string;
  targetHalkaId: string | null;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const { selected, user } = useInstitute();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // New announcement form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage =
    user.role === 'super_admin' || user.role === 'institute_manager' || user.role === 'teacher';

  const loadAnnouncements = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const list = await apiFetch<Announcement[]>(
        `/institutes/${selected.id}/announcements`,
      );
      setAnnouncements(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [selected?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      let uploadedUrl: string | undefined = undefined;
      if (imageFile) {
        uploadedUrl = await uploadFile(imageFile, 'image');
      }

      await apiFetch(`/institutes/${selected.id}/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          imageUrl: uploadedUrl,
        }),
      });

      setTitle('');
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setOpen(false);
      await loadAnnouncements();
    } catch (err: any) {
      setError(err?.message || 'تعذر نشر الإعلان');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selected || !confirm('هل أنت تأكد من حذف هذا الإعلان؟')) return;
    try {
      await apiFetch(`/institutes/${selected.id}/announcements/${id}`, {
        method: 'DELETE',
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err?.message || 'تعذر حذف الإعلان');
    }
  };

  if (!selected) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        يرجى اختيار معهد لعرض الإعلانات
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-foreground">
            <Megaphone className="size-7 text-primary" />
            لوحة الإعلانات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            آخر الأخبار والإعلانات الصادرة من المعهد
          </p>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-medium">
                <Plus className="size-4" />
                إضافة إعلان
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="size-5 text-primary" />
                  إضافة إعلان جديد
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الإعلان *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: رحلة ترفيهية متوقع تنظيمها الأسبوع القادم"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">تفاصيل الإعلان *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="اكتب تفاصيل الإعلان هنا..."
                    rows={5}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">صورة الإعلان (اختياري)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="relative mt-2 rounded-lg overflow-hidden border border-border h-40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="معاينة الصورة"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    نشر الإعلان
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <Megaphone className="size-12 mx-auto mb-3 opacity-30 text-primary" />
          <p className="text-lg font-medium">لا يوجد إعلانات منشورة حالياً</p>
          <p className="text-sm mt-1">سيتم إظهار أي إعلانات جديدة هنا عند نشرها</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {announcements.map((item) => {
            const imgSrc = resolveAsset(item.imageUrl);
            return (
              <Card
                key={item.id}
                className="overflow-hidden border-border/80 shadow-sm transition-all hover:shadow-md"
              >
                {imgSrc && (
                  <div className="w-full h-56 sm:h-72 bg-muted relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-xl font-bold text-foreground">
                      {item.title}
                    </CardTitle>
                    {user.role === 'institute_manager' ||
                    user.role === 'super_admin' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground block">
                    {new Date(item.createdAt).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-line">
                    {item.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
