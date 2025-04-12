import { Card, CardContent } from "@/components/ui/card";
import { GradientChart } from "@/components/ui/gradient-chart";
import { formatCurrency } from "@/lib/utils";
import { generateWeekDates } from "@/lib/date-utils";
import { MetricTimeframe } from "@shared/types";

interface MonthlyMetricsChartProps {
  data: {
    months: string[];
    values: number[];
  };
  timeframe?: MetricTimeframe;
}

export function MonthlyMetricsChart({ data, timeframe = "monthly" }: MonthlyMetricsChartProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Revenue Metrics
          </h3>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Transform data for the chart component
  let chartData;
  
  if (timeframe === "weekly") {
    // For weekly data, use actual dates from the current week (Monday-Sunday)
    const weekDates = generateWeekDates();
    
    // If there are 7 values in the data array, we can map them directly
    // Otherwise, we'll use the available data and dates
    const datesToUse = data.months.length === 7 ? weekDates : data.months;
    
    chartData = datesToUse.map((date, index) => ({
      name: date,
      value: data.values[index] || 0
    }));
  } else {
    // For other timeframes, use the provided data
    chartData = data.months.map((month, index) => ({
      name: month,
      value: data.values[index]
    }));
  }

  // Determine the chart title and description based on timeframe
  const getChartTitle = () => {
    switch (timeframe) {
      case "weekly":
        return "Weekly Revenue";
      case "monthly":
        return "Monthly Revenue";
      case "quarterly":
        return "Quarterly Revenue";
      case "yearly":
        return "Yearly Revenue";
      default:
        return "Revenue Metrics";
    }
  };

  const getChartDescription = () => {
    switch (timeframe) {
      case "weekly":
        return "Revenue activity over the past 7 days";
      case "monthly":
        return "Revenue activity over the past 30 days";
      case "quarterly":
        return "Revenue activity over the past 90 days";
      case "yearly":
        return "Revenue activity over the past 12 months";
      default:
        return "Revenue activity over time";
    }
  };

  // Custom tooltip formatter for currency
  const tooltipFormatter = (value: number) => formatCurrency(value);

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {getChartTitle()}
        </h3>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <p>{getChartDescription()}</p>
        </div>
        <div className="mt-5">
          <GradientChart 
            data={chartData} 
            height={250} 
            showGrid={true}
            valueFormatter={tooltipFormatter}
          />
        </div>
      </CardContent>
    </Card>
  );
}
