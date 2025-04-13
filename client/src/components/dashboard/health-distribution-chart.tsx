import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ResponsiveContainer, 
  AreaChart, 
  XAxis, 
  YAxis, 
  Area, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
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
            <AreaChart 
              data={data}
              margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="segment"
                tick={{ fontSize: 13, fontFamily: 'Manrope, sans-serif' }}
              />
              <YAxis 
                tick={{ fontSize: 13, fontFamily: 'Manrope, sans-serif' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "0.375rem",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  border: "none",
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: '13px'
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
                wrapperStyle={{ fontFamily: 'Manrope, sans-serif', fontSize: '13px' }}
                formatter={(value: string) => {
                  return value
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                }}
              />
              <defs>
                <linearGradient id="excellentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="goodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9298" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0D9298" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="averageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="atRiskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="excellent" 
                stackId="1" 
                stroke="#10B981" 
                fillOpacity={1} 
                fill="url(#excellentGradient)" 
                name="Excellent" 
              />
              <Area 
                type="monotone" 
                dataKey="good" 
                stackId="1" 
                stroke="#0D9298" 
                fillOpacity={1} 
                fill="url(#goodGradient)" 
                name="Good" 
              />
              <Area 
                type="monotone" 
                dataKey="average" 
                stackId="1" 
                stroke="#F59E0B" 
                fillOpacity={1} 
                fill="url(#averageGradient)" 
                name="Average" 
              />
              <Area 
                type="monotone" 
                dataKey="at_risk" 
                stackId="1" 
                stroke="#F97316" 
                fillOpacity={1} 
                fill="url(#atRiskGradient)" 
                name="At Risk" 
              />
              <Area 
                type="monotone" 
                dataKey="critical" 
                stackId="1" 
                stroke="#EF4444" 
                fillOpacity={1} 
                fill="url(#criticalGradient)" 
                name="Critical" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}