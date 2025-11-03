import { useMemo } from "react";
import { Users, TrendingUp, Film, Sparkles, UserPlus, BarChart3 } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { AdminMetricsDto, MetricCardVM } from "@/types/view/admin.types";

type MetricsCardsGridProps = {
  metrics: AdminMetricsDto;
};

/**
 * Maps AdminMetricsDto to array of MetricCardVM.
 * Creates 8 metric cards as specified in the plan.
 */
function mapMetricsToCards(metrics: AdminMetricsDto): MetricCardVM[] {
  return [
    {
      label: "Łączna liczba użytkowników",
      value: metrics.total_users.toLocaleString("pl-PL"),
      tooltip: "Całkowita liczba zarejestrowanych użytkowników",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Nowi użytkownicy",
      value: metrics.new_users.today.toLocaleString("pl-PL"),
      hint: "Dziś",
      tooltip: "Liczba użytkowników zarejestrowanych dzisiaj",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      label: "Nowi użytkownicy",
      value: metrics.new_users.last_7_days.toLocaleString("pl-PL"),
      hint: "Ostatnie 7 dni",
      tooltip: "Liczba użytkowników zarejestrowanych w ostatnich 7 dniach",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      label: "Nowi użytkownicy",
      value: metrics.new_users.last_30_days.toLocaleString("pl-PL"),
      hint: "Ostatnie 30 dni",
      tooltip: "Liczba użytkowników zarejestrowanych w ostatnich 30 dniach",
      icon: <UserPlus className="h-5 w-5" />,
    },
    {
      label: "Retention 7 dni",
      value: `${metrics.retention_7d_percent.toFixed(1)}%`,
      tooltip: "Procent użytkowników aktywnych po 7 dniach od rejestracji",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Retention 30 dni",
      value: `${metrics.retention_30d_percent.toFixed(1)}%`,
      tooltip: "Procent użytkowników aktywnych po 30 dniach od rejestracji",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Użytkownicy z ≥10 filmami",
      value: `${metrics.pct_users_with_min_10_movies.toFixed(1)}%`,
      tooltip: "Procent użytkowników którzy mają co najmniej 10 filmów na watchliście",
      icon: <Film className="h-5 w-5" />,
    },
    {
      label: "Użytkownicy używający AI",
      value: `${metrics.pct_users_used_ai.toFixed(1)}%`,
      tooltip: "Procent użytkowników którzy korzystali z funkcji sugerowania filmów AI",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      label: "Użytkownicy dodający filmy z AI",
      value: `${metrics.pct_users_added_ai_movies.toFixed(1)}%`,
      tooltip: "Procent użytkowników którzy dodali filmy z sugestii AI",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      label: "Średnia liczba filmów/użytkownika",
      value: metrics.avg_movies_per_user.toFixed(1),
      tooltip: "Średnia liczba filmów na watchliście per użytkownik",
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ];
}

/**
 * MetricsCardsGrid component.
 * Displays a responsive grid of metric cards (2-4 columns based on screen size).
 */
export function MetricsCardsGrid({ metrics }: MetricsCardsGridProps) {
  const cards = useMemo(() => mapMetricsToCards(metrics), [metrics]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <MetricCard key={index} vm={card} />
      ))}
    </div>
  );
}

