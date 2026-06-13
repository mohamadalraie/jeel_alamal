/**
 * Teacher extended-profile enums (spec 002). Shared because they appear in the
 * domain, DTOs, and persistence. Values are stable identifiers; Arabic labels
 * live in the frontend i18n bundles.
 */
export enum StudyDegree {
  Secondary = 'secondary', // ثانوية
  Diploma = 'diploma', // دبلوم
  Bachelor = 'bachelor', // بكالوريوس / إجازة
  Master = 'master', // ماجستير
  Phd = 'phd', // دكتوراه
}

export enum TajweedLevel {
  Excellent = 'excellent', // ممتاز
  VeryGood = 'very_good', // جيد جداً
  Good = 'good', // جيد
  Acceptable = 'acceptable', // مقبول
  Weak = 'weak', // ضعيف
}

export const STUDY_DEGREES = Object.values(StudyDegree);
export const TAJWEED_LEVELS = Object.values(TajweedLevel);
