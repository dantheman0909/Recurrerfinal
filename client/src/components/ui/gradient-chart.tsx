import React from "react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";

interface GradientChartProps {
  data: Array<{ name: string; value: number }>;
  className?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
  strokeColor?: string;
  valueFormatter?: (value: number) => string;
}

export function GradientChart({ 
  data, 
  className, 
  height = 200,
  showGrid = false,
  showAxis = true,
  gradientFrom = "#1E99A0", // Keeping the original color
  gradientTo = "rgba(13, 146, 152, 0)", // Keeping the original color
  strokeColor = "#0D9298", // Keeping the original color
  valueFormatter
}: GradientChartProps) {
  // Generate unique ID for this gradient to avoid conflicts
  const gradientId = React.useMemo(() => `colorGradient_${Math.floor(Math.random() * 1000)}`, []);
  
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientFrom} stopOpacity={0.4} /> {/* Slightly increased opacity */}
              <stop offset="90%" stopColor={gradientTo} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            hide={!showAxis}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            hide={!showAxis}
          />
          {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "white", 
              borderRadius: "0.375rem", 
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "none"
            }}
            itemStyle={{ color: strokeColor }}
            formatter={(value: number) => valueFormatter ? valueFormatter(value) : value}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={strokeColor} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
