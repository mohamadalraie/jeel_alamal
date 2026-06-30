import { Inject, Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { NotFoundError } from '../../../shared/domain/domain.error';
import { InstituteAccessPolicy } from '../../institutes/application/institute-access.policy';
import { LessonCategory } from '../domain/lesson-category.entity';
import { LESSON_REPOSITORY } from '../domain/lesson.repository';
import type { LessonRepository } from '../domain/lesson.repository';
import { CategoryView, CreateCategoryDto, UpdateCategoryDto } from './dto/lesson.dto';

const toView = (c: LessonCategory): CategoryView => ({
  id: c.id,
  name: c.name,
  color: c.color,
});

/** Create a lesson category for an institute. Manager only. */
@Injectable()
export class AddCategoryUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(
    actor: Actor,
    instituteId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryView> {
    await this.policy.assertManagerOf(actor, instituteId);
    const category = LessonCategory.create({ instituteId, name: dto.name, color: dto.color });
    await this.lessons.addCategory(category);
    return toView(category);
  }
}

/** List an institute's categories. Institute staff. */
@Injectable()
export class ListCategoriesUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, instituteId: string): Promise<CategoryView[]> {
    await this.policy.assertStaffOf(actor, instituteId);
    const categories = await this.lessons.listCategories(instituteId);
    return categories.map(toView);
  }
}

/** Rename / recolor a category. Manager only. */
@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, categoryId: string, dto: UpdateCategoryDto): Promise<void> {
    const category = await this.lessons.findCategoryById(categoryId);
    if (!category) throw new NotFoundError('Category not found');
    await this.policy.assertManagerOf(actor, category.instituteId);
    category.rename(dto.name, dto.color);
    await this.lessons.saveCategory(category);
  }
}

/** Delete a category; lessons that used it become uncategorized. Manager only. */
@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    private readonly policy: InstituteAccessPolicy,
    @Inject(LESSON_REPOSITORY) private readonly lessons: LessonRepository,
  ) {}

  async execute(actor: Actor, categoryId: string): Promise<void> {
    const category = await this.lessons.findCategoryById(categoryId);
    if (!category) throw new NotFoundError('Category not found');
    await this.policy.assertManagerOf(actor, category.instituteId);
    await this.lessons.deleteCategory(categoryId);
  }
}
