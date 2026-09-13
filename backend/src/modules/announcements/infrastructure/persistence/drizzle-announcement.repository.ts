import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { DRIZZLE } from '../../../../core/database/drizzle.provider';
import type { DrizzleDb } from '../../../../core/database/drizzle.provider';
import { Announcement } from '../../domain/announcement.entity';
import type { AnnouncementRepository } from '../../domain/announcement.repository';
import { announcements } from './announcement.schema';

@Injectable()
export class DrizzleAnnouncementRepository implements AnnouncementRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async save(announcement: Announcement): Promise<void> {
    await this.db.insert(announcements).values({
      id: announcement.id,
      instituteId: announcement.instituteId,
      authorId: announcement.authorId,
      targetHalkaId: announcement.targetHalkaId,
      title: announcement.title,
      content: announcement.content,
      imageUrl: announcement.imageUrl,
      createdAt: announcement.createdAt,
    });
  }

  async findById(id: string): Promise<Announcement | null> {
    const [row] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    return row
      ? Announcement.reconstitute(row.id, {
          instituteId: row.instituteId,
          authorId: row.authorId,
          targetHalkaId: row.targetHalkaId,
          title: row.title,
          content: row.content,
          imageUrl: row.imageUrl,
          createdAt: row.createdAt,
        })
      : null;
  }

  async findByInstitute(
    instituteId: string,
    halkaIds?: string[],
  ): Promise<Announcement[]> {
    const conditions = [eq(announcements.instituteId, instituteId)];

    if (halkaIds && halkaIds.length > 0) {
      conditions.push(
        or(
          isNull(announcements.targetHalkaId),
          inArray(announcements.targetHalkaId, halkaIds),
        )!,
      );
    }

    const rows = await this.db
      .select()
      .from(announcements)
      .where(and(...conditions))
      .orderBy(desc(announcements.createdAt));

    return rows.map((row) =>
      Announcement.reconstitute(row.id, {
        instituteId: row.instituteId,
        authorId: row.authorId,
        targetHalkaId: row.targetHalkaId,
        title: row.title,
        content: row.content,
        imageUrl: row.imageUrl,
        createdAt: row.createdAt,
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(announcements).where(eq(announcements.id, id));
  }
}
