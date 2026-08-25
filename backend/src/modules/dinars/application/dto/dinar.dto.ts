import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  NotEquals,
} from 'class-validator';
import { DinarContext } from '../../domain/dinar-context';

// ── Rule config (manager) ──

export class CreateRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsInt()
  @NotEquals(0)
  amount: number;

  @IsEnum(DinarContext)
  context: DinarContext; // must be lesson | recitation (enforced in domain)
}

export class UpdateRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @NotEquals(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Awarding (teacher / manager) ──

export class AwardDinarDto {
  @IsOptional()
  @IsUUID()
  ruleId?: string;

  @IsOptional()
  @IsInt()
  @NotEquals(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @IsOptional()
  @IsEnum(DinarContext)
  context?: DinarContext;
}

export class BulkAwardDinarDto extends AwardDinarDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  studentIds: string[];
}

// ── Views ──

export interface DinarRuleView {
  id: string;
  name: string;
  amount: number;
  context: DinarContext;
  trigger: string;
  systemKey: string | null;
  isActive: boolean;
  isProtected: boolean;
  createdAt: string;
}

export interface DinarRulesView {
  manual: DinarRuleView[];
  system: DinarRuleView[];
}

export interface DinarLedgerItem {
  id: string;
  amount: number;
  context: DinarContext;
  sourceType: string;
  label: string;
  awardedByName: string | null;
  reversesId: string | null;
  reversedAt: string | null;
  createdAt: string;
}

export interface DinarSummaryView {
  net: number;
  positive: number;
  negative: number;
  count: number;
}

export interface StudentDinarsView {
  summary: DinarSummaryView;
  ledger: DinarLedgerItem[];
}

export interface DinarLeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  balance: number;
}

export interface DinarLeaderboardView {
  scope: 'institute' | 'class';
  rows: DinarLeaderboardRow[];
}
