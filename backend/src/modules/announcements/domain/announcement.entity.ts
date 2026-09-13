import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';
import { BusinessRuleError } from '../../../shared/domain/domain.error';

interface AnnouncementProps {
  instituteId: string;
  authorId: string;
  targetHalkaId: string | null;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
}

export class Announcement extends Entity<string> {
  private props: AnnouncementProps;

  private constructor(id: string, props: AnnouncementProps) {
    super(id);
    this.props = props;
  }

  static create(input: {
    instituteId: string;
    authorId: string;
    targetHalkaId?: string | null;
    title: string;
    content: string;
    imageUrl?: string | null;
  }): Announcement {
    const title = input.title.trim();
    const content = input.content.trim();
    if (!title) throw new BusinessRuleError('Announcement title is required');
    if (!content)
      throw new BusinessRuleError('Announcement content is required');

    return new Announcement(randomUUID(), {
      instituteId: input.instituteId,
      authorId: input.authorId,
      targetHalkaId: input.targetHalkaId ?? null,
      title,
      content,
      imageUrl: input.imageUrl?.trim() || null,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: AnnouncementProps): Announcement {
    return new Announcement(id, props);
  }

  get instituteId(): string {
    return this.props.instituteId;
  }
  get authorId(): string {
    return this.props.authorId;
  }
  get targetHalkaId(): string | null {
    return this.props.targetHalkaId;
  }
  get title(): string {
    return this.props.title;
  }
  get content(): string {
    return this.props.content;
  }
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
