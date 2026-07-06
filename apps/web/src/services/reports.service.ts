import { api } from "@/lib/api/client";
import type { ApiReportSummary } from "@/lib/api/types";

export interface ReportRange {
  from?: string;
  to?: string;
}

export const reportsService = {
  /** Aggregated store insights for an optional date range. */
  summary(range: ReportRange = {}): Promise<ApiReportSummary> {
    return api.get<ApiReportSummary>("/reports/summary", {
      query: { from: range.from, to: range.to },
    });
  },
};
