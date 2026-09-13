import { Announcement } from '../../domain/announcement.entity';

export class AnnouncementResponseDto {
  id: string;
  instituteId: string;
  authorId: string;
  targetHalkaId: string | null;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;

  static fromDomain(entity: Announcement): AnnouncementResponseDto {
    const dto = new AnnouncementResponseDto();
    dto.id = entity.id;
    dto.instituteId = entity.instituteId;
    dto.authorId = entity.authorId;
    dto.targetHalkaId = entity.targetHalkaId;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.imageUrl = entity.imageUrl;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
