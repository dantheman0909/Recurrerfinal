import React, { useRef, useEffect } from 'react';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';

Chart.register(...registerables);

interface BarChartProps {
  data: ChartData;
  options?: ChartOptions;
}

export function BarChart({ data, options }: BarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    // Destroy existing Chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    
    // Create a new Chart instance
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    const defaultOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 10,
          cornerRadius: 4,
          titleFont: {
            size: 14,
            weight: 'bold',
          },
          bodyFont: {
            size: 12,
          },
          displayColors: true,
          usePointStyle: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    };
    
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: { ...defaultOptions, ...options },
    });
    
    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [data, options]);

  return <canvas ref={chartRef} />;
}