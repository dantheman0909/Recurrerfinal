import React from "react";

interface BarChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors: string[];
  valueFormatter?: (value: number) => string;
  yAxisWidth?: number;
  className?: string;
}

export function BarChart({ 
  data,
  index,
  categories,
  colors,
  valueFormatter = (value) => `${value}`,
  yAxisWidth = 40,
  className = "",
}: BarChartProps) {
  // If no data is provided, show placeholder
  if (!data || data.length === 0) {
    return (
      <div className={`h-full w-full flex items-center justify-center ${className}`}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Simple bar chart implementation
  return (
    <div className={`h-full w-full ${className}`}>
      <div className="h-full flex items-end space-x-4 pt-8 pb-4">
        {data.map((item, idx) => {
          const value = item.value || 0;
          const maxValue = Math.max(...data.map(d => d.value || 0));
          const height = maxValue > 0 ? (value / maxValue) * 80 : 0;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="w-full mb-2 flex justify-center">
                <span className="text-sm font-medium">{valueFormatter(value)}</span>
              </div>
              <div 
                className={`w-full rounded-t-md ${
                  idx === 0 ? "bg-red-500" : 
                  idx === 1 ? "bg-orange-500" : "bg-yellow-500"
                }`}
                style={{ height: `${height}%`, minHeight: value > 0 ? '8px' : '0' }}
              ></div>
              <div className="w-full mt-2 text-center">
                <span className="text-xs">{item.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}