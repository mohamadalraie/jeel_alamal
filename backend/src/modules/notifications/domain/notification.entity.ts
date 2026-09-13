import { randomUUID } from 'node:crypto';
import { Entity } from '../../../shared/domain/entity.base';

interface NotificationProps {
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

export class NotificationItem extends Entity<string> {
  private props: NotificationProps;

  private constructor(id: string, props: NotificationProps) {
    super(id);
    this.props = props;
  }

  static create(input: {
    userId: string;
    title: string;
    message: string;
    link?: string | null;
    type?: string;
  }): NotificationItem {
    return new NotificationItem(randomUUID(), {
      userId: input.userId,
      title: input.title.trim(),
      message: input.message.trim(),
      link: input.link?.trim() || null,
      type: input.type || 'general',
      isRead: false,
      createdAt: new Date(),
    });
  }

  static reconstitute(id: string, props: NotificationProps): NotificationItem {
    return new NotificationItem(id, props);
  }

  markAsRead(): void {
    this.props.isRead = true;
  }

  get userId(): string {
    return this.props.userId;
  }
  get title(): string {
    return this.props.title;
  }
  get message(): string {
    return this.props.message;
  }
  get link(): string | null {
    return this.props.link ?? null;
  }
  get type(): string {
    return this.props.type;
  }
  get isRead(): boolean {
    return this.props.isRead;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
