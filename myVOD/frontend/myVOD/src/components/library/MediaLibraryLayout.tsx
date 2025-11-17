import type { ReactNode } from "react";
import { ICONS } from "@/constants/assets";

type MediaLibraryTabItem = {
  id: string;
  label: string;
  isActive: boolean;
  onSelect: () => void;
};

type MediaLibraryLayoutProps = {
  title: string;
  subtitle?: string;
  tabs?: MediaLibraryTabItem[];
  headerActions?: ReactNode;
  globalFilters?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
};

/**
 * Shared layout for media library views (watchlist / watched).
 * Encapsulates header, optional navigation tabs, toolbar slot and content container.
 */
export function MediaLibraryLayout({
  title,
  subtitle,
  tabs,
  headerActions,
  globalFilters,
  toolbar,
  children,
}: MediaLibraryLayoutProps) {
  const shouldRenderTabs = Array.isArray(tabs) && tabs.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <img src={ICONS.appLogo} alt="myVOD Logo" className="h-16 w-12" />
              <div className="flex-1">
                <h1 className="text-2xl lg:text-4xl font-bold text-foreground">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-muted-foreground mt-2">{subtitle}</p>
                ) : null}
              </div>
            </div>
            {headerActions ? (
              <div className="flex items-center gap-3 self-start">
                {headerActions}
              </div>
            ) : null}
          </div>

          {/* Navigation tabs and global filters in same row */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex flex-wrap gap-2">
              {shouldRenderTabs ? tabs.map((tab) => {
                const isActive = tab.isActive;
                const baseClasses =
                  "px-4 py-2 rounded-lg font-medium transition-colors shadow-sm";
                const activeClasses = "bg-primary text-primary-foreground";
                const inactiveClasses =
                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground";

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={tab.onSelect}
                    className={`${baseClasses} ${
                      isActive ? activeClasses : inactiveClasses
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              }) : null}
            </div>

            {globalFilters ? (
              <div className="flex-shrink-0">
                {globalFilters}
              </div>
            ) : null}
          </div>
        </header>

        {toolbar ? <div className="mb-6">{toolbar}</div> : null}

        <section className="bg-card rounded-lg shadow-lg overflow-hidden">
          {children}
        </section>
      </div>
    </div>
  );
}
