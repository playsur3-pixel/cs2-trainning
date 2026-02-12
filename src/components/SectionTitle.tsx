import * as React from "react";
import { cn } from "../lib/cn";

export function SectionTitle({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}
