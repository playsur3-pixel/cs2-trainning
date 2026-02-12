import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { Badge } from "./Badge";
import type { Showcase } from "../data/profile";

export function ShowcaseGrid({ items }: { items: Showcase[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {items.map((it) => (
        <Card key={it.title} className="overflow-hidden">
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={it.img}
              alt={it.title}
              className="h-full w-full object-cover opacity-95"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/30 to-transparent" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle>{it.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">{it.desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {it.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            {it.href ? (
              <a
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cs2 hover:underline"
                href={it.href}
                target="_blank"
                rel="noreferrer"
              >
                Voir <span aria-hidden>→</span>
              </a>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
