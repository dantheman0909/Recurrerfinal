import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { ChartData } from "@shared/types";
import { chartColors } from "@/lib/utils";

interface ChartComponentProps {
  type: "bar" | "line" | "doughnut";
  data: ChartData;
  options?: any;
  height?: number;
}

export function ChartComponent({ type, data, options = {}, height = 250 }: ChartComponentProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const [chartInstance, setChartInstance] = useState<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Apply gradient fills for datasets if chart type is not doughnut
    let chartData = { ...data };
    if (type !== "doughnut") {
      const ctx = chartRef.current.getContext("2d");
      if (ctx) {
        chartData = {
          ...data,
          datasets: data.datasets.map((dataset, index) => {
            // For line charts, create a gradient fill
            if (type === "line") {
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              const color = chartColors.teal[index % chartColors.teal.length];
              // Use rgba instead of hex with alpha to avoid parsing issues
              const baseColor = typeof color === 'string' ? color.replace('hsl', 'hsla').replace(')', ', 0.8)') : 'rgba(0, 128, 128, 0.8)';
              const transparentColor = typeof color === 'string' ? color.replace('hsl', 'hsla').replace(')', ', 0.1)') : 'rgba(0, 128, 128, 0.1)';
              gradient.addColorStop(0, baseColor); // Semi-transparent at top
              gradient.addColorStop(1, transparentColor); // Transparent at bottom
              
              return {
                ...dataset,
                backgroundColor: gradient,
                borderColor: color,
              };
            }
            
            // For bar charts, use gradients for bars
            if (type === "bar") {
              return {
                ...dataset,
                backgroundColor: chartColors.teal[index % chartColors.teal.length],
                borderRadius: 6,
                borderWidth: 0
              };
            }
            
            return dataset;
          })
        };
      }
    } else {
      // For doughnut charts, use category colors
      chartData = {
        ...data,
        datasets: data.datasets.map(dataset => ({
          ...dataset,
          backgroundColor: chartColors.categoryColors.slice(0, dataset.data.length),
          borderWidth: 0,
          borderRadius: 4
        }))
      };
    }

    // Destroy previous chart instance
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Create default options based on chart type
    let defaultOptions = {};
    
    if (type === "bar") {
      defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              color: '#f3f4f6'
            },
            ticks: {
              precision: 0
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      };
    } else if (type === "line") {
      defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              display: true,
              color: '#f3f4f6'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      };
    } else if (type === "doughnut") {
      defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      };
    }

    // Create new chart
    const newChartInstance = new Chart(chartRef.current, {
      type,
      data: chartData,
      options: { ...defaultOptions, ...options }
    });

    setChartInstance(newChartInstance);

    // Cleanup function
    return () => {
      if (newChartInstance) {
        newChartInstance.destroy();
      }
    };
  }, [type, data, options]);

  return <canvas ref={chartRef} height={height}></canvas>;
}
