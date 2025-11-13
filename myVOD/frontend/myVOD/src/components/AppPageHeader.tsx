import { ICONS } from "@/constants/assets";
import type { ReactNode } from "react";

type AppPageHeaderProps = {
  title: string;
  children?: ReactNode;
};

export function AppPageHeader({ title, children }: AppPageHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <img src={ICONS.appLogo} alt="myVOD Logo" className="h-10 w-10" />
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  );
}