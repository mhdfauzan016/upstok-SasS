import { IsDateString, IsOptional } from 'class-validator';

/** GET /reports/summary — optional inclusive date range (ISO dates). */
export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
