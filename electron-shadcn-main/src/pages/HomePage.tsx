import React from "react";
import ToggleTheme from "@/components/ToggleTheme";

export default function HomePage() {
    return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <span>
          <h1 className="font-mono text-4xl font-bold">{t("appName")}</h1>
          <p className="text-end text-sm uppercase text-muted-foreground" data-testid="pageTitle">
            {t("titleHomePage")}
          </p>
        </span>
        <ToggleTheme />
    </div>
  );
}
