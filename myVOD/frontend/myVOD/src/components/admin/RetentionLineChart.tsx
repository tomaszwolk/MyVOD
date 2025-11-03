import { useEffect, useRef } from "react";
import type { RetentionPoint } from "@/types/view/admin.types";

type RetentionLineChartProps = {
  data: RetentionPoint[];
};

/**
 * RetentionLineChart component.
 * Displays a line chart with 7-day and 30-day retention data using Chart.js.
 */
export function RetentionLineChart({ data }: RetentionLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) {
      return;
    }

    // Dynamically import Chart.js
    const initChart = async () => {
      try {
        // Try to use Chart.js from CDN if available in window
        const Chart = (window as any).Chart;
        
        if (!Chart) {
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
        }

        const ChartLib = (window as any).Chart;
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

        const retention7d = data.map((point) => point.retention_7d);
        const retention30d = data.map((point) => point.retention_30d);

        chartInstanceRef.current = new ChartLib(ctx, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Retention 7 dni",
                data: retention7d,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                tension: 0.1,
              },
              {
                label: "Retention 30 dni",
                data: retention30d,
                borderColor: "rgb(16, 185, 129)",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                tension: 0.1,
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
                max: 100,
                ticks: {
                  callback: function (value: any) {
                    return value + "%";
                  },
                },
              },
            },
            interaction: {
              mode: "nearest",
              axis: "x",
              intersect: false,
            },
          },
        });
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
      <h3 className="text-lg font-semibold mb-4">Retention użytkowników</h3>
      <div className="h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

