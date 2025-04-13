import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip, Legend, CartesianGrid } from 'recharts';
import { HelpCircle } from 'lucide-react';
import { 
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Health score distribution data by customer segment
interface HealthDistributionData {
  segment: string;
  excellent: number;
  good: number;
  average: number;
  at_risk: number;
  critical: number;
}

interface HealthDistributionChartProps {
  data: HealthDistributionData[];
  className?: string;
  helpText?: string;
}

export function HealthDistributionChart({ 
  data, 
  className = '',
  helpText = 'This chart shows the distribution of customer health scores across different segments. Health scores are calculated based on engagement, usage, and support metrics.'
}: HealthDistributionChartProps) {

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Customer Health Distribution</CardTitle>
          
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <CardDescription>By customer segment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis 
                dataKey="segment" 
                type="category" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "0.375rem",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "none"
                }}
                formatter={(value: any, name: string) => {
                  const formattedName = name
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  return [`${value}%`, formattedName];
                }}
              />
              <Legend 
                formatter={(value: string) => {
                  return value
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                }}
              />
              <Bar dataKey="excellent" stackId="a" fill="#10B981" name="Excellent" radius={[0, 4, 4, 0]} />
              <Bar dataKey="good" stackId="a" fill="#0D9298" name="Good" radius={[0, 0, 0, 0]} />
              <Bar dataKey="average" stackId="a" fill="#F59E0B" name="Average" radius={[0, 0, 0, 0]} />
              <Bar dataKey="at_risk" stackId="a" fill="#F97316" name="At Risk" radius={[0, 0, 0, 0]} />
              <Bar dataKey="critical" stackId="a" fill="#EF4444" name="Critical" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}