import { Card, CardContent } from "@/components/ui/card";
import { GradientChart } from "@/components/ui/gradient-chart";

interface MonthlyMetricsChartProps {
  data: {
    months: string[];
    values: number[];
  };
}

export function MonthlyMetricsChart({ data }: MonthlyMetricsChartProps) {
  // Transform data for the chart component
  const chartData = data.months.map((month, index) => ({
    name: month,
    value: data.values[index]
  }));

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Monthly Metrics
        </h3>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <p>Customer activity over the past 6 months</p>
        </div>
        <div className="mt-5">
          <GradientChart 
            data={chartData} 
            height={250} 
            showGrid={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
