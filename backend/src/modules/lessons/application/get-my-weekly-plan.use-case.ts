import { Injectable, Inject } from '@nestjs/common';
import { Actor } from '../../../shared/application/actor';
import { ForbiddenError } from '../../../shared/domain/domain.error';
import { CLASS_REPOSITORY, type ClassRepository } from '../../classes/domain/class.repository';
import { GetWeeklyPlanUseCase, type WeeklyPlanSlot } from './get-weekly-plan.use-case';
import { UserRole } from '../../../shared/domain/user-role';

@Injectable()
export class GetMyWeeklyPlanUseCase {
  constructor(
    @Inject(CLASS_REPOSITORY) private readonly classes: ClassRepository,
    private readonly getWeeklyPlan: GetWeeklyPlanUseCase,
  ) {}

  async execute(
    actor: Actor,
    weekStart: string,
  ): Promise<WeeklyPlanSlot[]> {
    if (actor.role !== UserRole.Student) {
      throw new ForbiddenError('Only students can fetch their merged weekly plan');
    }

    const [currentRegular, currentIntensive] = await Promise.all([
      this.classes.findCurrentClassOfStudent(actor.userId),
      this.classes.findCurrentIntensiveClassOfStudent(actor.userId),
    ]);

    const plans = await Promise.all([
      currentRegular 
        ? this.getWeeklyPlan.execute(actor, currentRegular.id, weekStart).catch((err) => {
            // If lessons are hidden, ignore it and return empty
            if (err instanceof ForbiddenError) return [];
            throw err;
          })
        : Promise.resolve([]),
      currentIntensive 
        ? this.getWeeklyPlan.execute(actor, currentIntensive.id, weekStart).catch((err) => {
            if (err instanceof ForbiddenError) return [];
            throw err;
          })
        : Promise.resolve([]),
    ]);

    // Merge and sort
    const allSlots = [...plans[0], ...plans[1]];
    
    // Optional: Sort them chronologically
    return allSlots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      // Sort by anchor time (value) if possible
      const aStart = a.startTime?.value ?? '99:99';
      const bStart = b.startTime?.value ?? '99:99';
      return aStart.localeCompare(bStart);
    });
  }
}
