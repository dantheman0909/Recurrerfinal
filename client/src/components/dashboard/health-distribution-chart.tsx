import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HealthDistributionChartProps {
  data: {
    status: string[];
    counts: number[];
  };
}

export function HealthDistributionChart({ data }: HealthDistributionChartProps) {
  // If data is undefined or doesn't have the expected structure, use defaults
  if (!data || !data.status || !data.counts) {
    // Default values for rendering
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Customer Health Distribution
          </h3>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process the data arrays to find the values
  const getStatusPercentage = (statusName: string): number => {
    const index = data.status.findIndex(status => 
      status.toLowerCase() === statusName.toLowerCase()
    );
    return index >= 0 ? data.counts[index] : 0;
  };

  // Extract values for each status type
  const healthyPercentage = getStatusPercentage('healthy');
  const atRiskPercentage = getStatusPercentage('at risk');
  const redZonePercentage = getStatusPercentage('red zone');

  // Calculate the total for the donut chart
  const total = data.counts.reduce((sum, count) => sum + count, 0);
  
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Customer Health Distribution
        </h3>
        <div className="mt-2 flex items-center text-sm text-gray-500">
          <p>Overall status of your customer base</p>
        </div>
        <div className="mt-6 flex justify-around">
          <div className="text-center">
            <div className="mx-auto relative">
              <DonutChart 
                percentage={healthyPercentage} 
                color="bg-teal-400"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-900">{healthyPercentage}%</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-500">
              Healthy
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex flex-col space-y-3">
              <LegendItem color="bg-teal-400" label={`Healthy (${healthyPercentage}%)`} />
              <LegendItem color="bg-yellow-400" label={`At Risk (${atRiskPercentage}%)`} />
              <LegendItem color="bg-red-400" label={`Red Zone (${redZonePercentage}%)`} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DonutChartProps {
  percentage: number;
  color: string;
}

function DonutChart({ percentage, color }: DonutChartProps) {
  // CSS conic gradient for the donut chart
  const gradientStyle = {
    background: `conic-gradient(${color} 0% ${percentage}%, #E5E7EB ${percentage}% 100%)`
  };

  return (
    <div className="relative w-36 h-36">
      <div 
        className="w-full h-full rounded-full"
        style={gradientStyle}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-white rounded-full"></div>
      </div>
    </div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <div className="flex items-center">
      <div className={cn("w-4 h-4 rounded-full", color)}></div>
      <span className="ml-2 text-sm text-gray-600">{label}</span>
    </div>
  );
}
