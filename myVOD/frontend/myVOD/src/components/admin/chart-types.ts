export type ChartType = "line" | "bar";

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  borderWidth?: number;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartLegendOptions {
  display: boolean;
  position: "top" | "bottom" | "left" | "right";
}

export interface ChartTooltipOptions {
  mode: "index" | "nearest";
  intersect: boolean;
}

export interface ChartScaleTickOptions {
  stepSize?: number;
  callback?: (value: number) => string;
}

export interface ChartScaleOptions {
  beginAtZero: boolean;
  max?: number;
  ticks?: ChartScaleTickOptions;
}

export interface ChartInteractionOptions {
  mode: "nearest" | "index";
  axis: "x" | "y" | "xy";
  intersect: boolean;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: ChartLegendOptions;
    tooltip: ChartTooltipOptions;
  };
  scales: {
    y: ChartScaleOptions;
  };
  interaction: ChartInteractionOptions;
}

export interface ChartConfiguration<TType extends ChartType> {
  type: TType;
  data: ChartData;
  options: ChartOptions;
}

export interface ChartInstance {
  destroy(): void;
}

export interface ChartConstructor<TType extends ChartType = ChartType> {
  new (ctx: CanvasRenderingContext2D, config: ChartConfiguration<TType>): ChartInstance;
}

