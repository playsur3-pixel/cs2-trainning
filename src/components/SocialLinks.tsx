import { ExternalLink, Gamepad2, Youtube, MessageSquare, Shield } from "lucide-react";
import type { Link } from "../data/profile";

const iconFor = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("steam")) return Gamepad2;
  if (l.includes("faceit")) return Shield;
  if (l.includes("youtube")) return Youtube;
  if (l.includes("discord")) return MessageSquare;
  return ExternalLink;
};

export function SocialLinks({ links }: { links: Link[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => {
        const Icon = iconFor(l.label);
        return (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-bg/40 px-3 py-1.5 text-sm text-muted hover:border-cs2/60 hover:text-text"
          >
            <Icon className="h-4 w-4" />
            {l.label}
          </a>
        );
      })}
    </div>
  );
}
