import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import type { Stat } from "../data/profile";

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {stats.map((s) => (
        <Card key={s.label} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted">{s.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">{s.value}</div>
            {s.hint ? <div className="mt-1 text-xs text-muted">{s.hint}</div> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
