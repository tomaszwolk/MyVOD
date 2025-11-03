import { RetentionLineChart } from "./RetentionLineChart";
import { UsersGrowthBarChart } from "./UsersGrowthBarChart";
import type { AdminMetricsDto } from "@/types/view/admin.types";

type ChartsRowProps = {
  metrics: AdminMetricsDto;
};

/**
 * ChartsRow component.
 * Displays two charts side by side: retention line chart and users growth bar chart.
 */
export function ChartsRow({ metrics }: ChartsRowProps) {
  const retentionData = metrics.retention_timeseries || [];
  const usersGrowthData = metrics.new_users_timeseries || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RetentionLineChart data={retentionData} />
      <UsersGrowthBarChart data={usersGrowthData} />
    </div>
  );
}

