import { Announcement } from './announcement.entity';

export const ANNOUNCEMENT_REPOSITORY = Symbol('ANNOUNCEMENT_REPOSITORY');

export interface AnnouncementRepository {
  save(announcement: Announcement): Promise<void>;
  findById(id: string): Promise<Announcement | null>;
  findByInstitute(
    instituteId: string,
    halkaIds?: string[],
  ): Promise<Announcement[]>;
  delete(id: string): Promise<void>;
}
