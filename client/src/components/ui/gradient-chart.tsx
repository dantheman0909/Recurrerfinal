import React, { useState, useEffect } from "react";
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
  animationDuration?: number;
}

export function GradientChart({ 
  data, 
  className, 
  height = 200,
  showGrid = false,
  showAxis = true,
  gradientFrom = "#4338ca", // Updated to indigo
  gradientTo = "rgba(67, 56, 202, 0)", // Updated to indigo
  strokeColor = "#4f46e5", // Updated to indigo
  valueFormatter,
  animationDuration = 1500
}: GradientChartProps) {
  // Animation states
  const [animationComplete, setAnimationComplete] = useState(false);
  const [animatedData, setAnimatedData] = useState<Array<{ name: string; value: number }>>([]);
  
  // Create animation effect
  useEffect(() => {
    // Reset animation when data changes
    setAnimationComplete(false);
    const initialData = data.map(item => ({ ...item, value: 0 }));
    setAnimatedData(initialData);
    
    // Animate data points
    const interval = 30; // ms between animation frames
    const frames = animationDuration / interval;
    let frame = 0;
    
    const timer = setInterval(() => {
      frame++;
      const progress = frame / frames;
      
      if (progress >= 1) {
        clearInterval(timer);
        setAnimatedData(data);
        setAnimationComplete(true);
      } else {
        const newData = data.map((item, idx) => ({
          name: item.name,
          value: Math.floor(item.value * progress)
        }));
        setAnimatedData(newData);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [data, animationDuration]);
  
  // Generate unique ID for this gradient to avoid conflicts
  const gradientId = React.useMemo(() => `colorGradient_${Math.floor(Math.random() * 1000)}`, []);
  
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart 
          data={animatedData} 
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientFrom} stopOpacity={0.5} /> {/* Increased opacity */}
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
            isAnimationActive={!animationComplete}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
