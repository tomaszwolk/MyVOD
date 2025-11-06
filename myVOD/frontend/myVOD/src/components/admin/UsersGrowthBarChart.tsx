import { useEffect, useRef } from "react";
import type { UsersGrowthPoint } from "@/types/view/admin.types";
import type { ChartConstructor, ChartInstance, ChartConfiguration } from "./chart-types";

type UsersGrowthBarChartProps = {
  data: UsersGrowthPoint[];
};

declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}

/**
 * UsersGrowthBarChart component.
 * Displays a bar chart with new users growth over time using Chart.js.
 */
export function UsersGrowthBarChart({ data }: UsersGrowthBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<ChartInstance | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) {
      return;
    }

    // Dynamically import Chart.js
    const initChart = async () => {
      try {
        // Try to use Chart.js from CDN if available in window
        let chartConstructor = window.Chart;
        
        if (!chartConstructor) {
          // Load Chart.js from CDN if not available
          await new Promise<void>((resolve, reject) => {
            if (document.querySelector('script[src*="chart.js"]')) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Chart.js"));
            document.head.appendChild(script);
          });
          chartConstructor = window.Chart;
        }

        const ChartLib = chartConstructor;
        if (!ChartLib) {
          console.error("Chart.js not available");
          return;
        }

        const ctx = canvasRef.current!.getContext("2d");
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        // Prepare data
        const labels = data.map((point) => {
          const date = new Date(point.date);
          return date.toLocaleDateString("pl-PL", { month: "short", day: "numeric" });
        });

        const counts = data.map((point) => point.count);

        const chartConfig: ChartConfiguration<"bar"> = {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Nowi użytkownicy",
                data: counts,
                backgroundColor: "rgba(59, 130, 246, 0.8)",
                borderColor: "rgb(59, 130, 246)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: "top",
              },
              tooltip: {
                mode: "index",
                intersect: false,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                },
              },
            },
            interaction: {
              mode: "nearest",
              axis: "x",
              intersect: false,
            },
          },
        };

        chartInstanceRef.current = new ChartLib(ctx, chartConfig);
      } catch (error) {
        console.error("Error initializing chart:", error);
      }
    };

    initChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted rounded-lg">
        <p>Brak danych do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-lg font-semibold mb-4">Wzrost użytkowników</h3>
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

