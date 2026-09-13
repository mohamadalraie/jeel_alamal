'use client';

import { useEffect, useState } from 'react';
import { Search, UserCheck, UserPlus, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MemberFields, type MemberDraft } from './member-fields';

export interface UserSearchResult {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

interface UserSelectOrFieldsProps {
  role: 'teacher' | 'student' | 'institute_manager';
  mode: 'new' | 'existing';
  onModeChange: (mode: 'new' | 'existing') => void;
  newDraft: MemberDraft;
  onNewDraftChange: (draft: MemberDraft) => void;
  selectedUserId: string | null;
  onSelectUser: (user: UserSearchResult | null) => void;
  withSchoolGrade?: boolean;
  idPrefix?: string;
}

export function UserSelectOrFields({
  role,
  mode,
  onModeChange,
  newDraft,
  onNewDraftChange,
  selectedUserId,
  onSelectUser,
  withSchoolGrade,
  idPrefix = 'usr',
}: UserSelectOrFieldsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserObj, setSelectedUserObj] = useState<UserSearchResult | null>(null);

  useEffect(() => {
    if (mode !== 'existing') return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await apiFetch<UserSearchResult[]>(
          `/users/search?role=${role}&q=${encodeURIComponent(searchQuery)}`,
        );
        setResults(list);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, role, mode]);

  return (
    <div className="space-y-4">
      {/* Segmented Control / Toggle */}
      <div className="grid grid-cols-2 p-1 bg-muted rounded-lg gap-1">
        <button
          type="button"
          onClick={() => onModeChange('new')}
          className={`flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
            mode === 'new'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserPlus className="size-3.5" />
          حساب جديد
        </button>
        <button
          type="button"
          onClick={() => onModeChange('existing')}
          className={`flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
            mode === 'existing'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="size-3.5" />
          حساب موجود مسبقاً
        </button>
      </div>

      {mode === 'new' ? (
        <MemberFields
          value={newDraft}
          onChange={onNewDraftChange}
          withSchoolGrade={withSchoolGrade}
          idPrefix={idPrefix}
        />
      ) : (
        <div className="space-y-3 pt-1">
          <Label className="text-xs font-medium">البحث عن الحساب في النظام</Label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              className="pe-9"
            />
          </div>

          <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                جاري البحث...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                لم يتم العثور على حسابات مطابقة
              </div>
            ) : (
              results.map((u) => {
                const isSelected = selectedUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserObj(u);
                      onSelectUser(u);
                    }}
                    className={`w-full text-start p-2.5 flex items-center justify-between text-xs transition-colors hover:bg-accent ${
                      isSelected ? 'bg-accent/80 font-bold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {u.firstName} {u.lastName} ({u.username})
                      </div>
                      {u.phone && (
                        <div className="text-[11px] text-muted-foreground">
                          {u.phone}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="size-4 text-primary" />}
                  </button>
                );
              })
            )}
          </div>

          {selectedUserObj && (
            <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-md text-xs flex items-center justify-between">
              <span>
                الحساب المحدد: <strong>{selectedUserObj.firstName} {selectedUserObj.lastName}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserObj(null);
                  onSelectUser(null);
                }}
                className="text-destructive hover:underline text-[11px]"
              >
                إلغاء التحديد
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
