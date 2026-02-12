import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Badge } from "./Badge";
import type { Skill } from "../data/profile";

export function SkillCards({ skills }: { skills: Skill[] }) {
  const featured = skills.find((s) => s.featured) ?? skills[0];
  const rest = skills.filter((s) => s !== featured);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Featured Coaching */}
      <Card className="md:col-span-2 border-cs2/60 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-xl">🎯 {featured.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">{featured.desc}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {featured.tags.map((t) => (
              <Badge key={t} className="border-cs2/30">{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Secondary qualities */}
      {rest.map((s) => (
        <Card key={s.title} className="opacity-90 hover:opacity-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{s.title}</span>
              <span className="h-2 w-2 rounded-full bg-border" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">{s.desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
