import { motion } from "framer-motion";
import { Card } from "./Card";
import type { Link } from "../data/profile";
import { SocialLinks } from "./SocialLinks";

export function Hero({
  cover,
  avatar,
  displayName,
  handle,
  tagline,
  status,
  location,
  about,
  ctas,
  links,
  videos
}: {
  cover: string;
  avatar: string;
  displayName: string;
  handle: string;
  tagline: string;
  status: string;
  location: string;
  about: string;
  ctas: Link[];
  links: Link[];
  videos: string[];
}) {
  return (
    <section id="overview" className="scroll-mt-24">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={avatar}
                alt={displayName}
                className="h-20 w-20 rounded-2xl border border-border/50 object-cover"
              />
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card bg-cs2" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{displayName}</div>
              <div className="truncate text-sm text-muted">@{handle}</div>
              <div className="mt-2 text-sm">{tagline}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/50 bg-bg/40 p-3">
            <div className="text-sm font-semibold">{status}</div>
            <div className="mt-1 text-xs text-muted">{location}</div>
          </div>

          <p className="mt-4 text-sm text-muted">{about}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {ctas.map((c) => (
              <a
                key={c.href}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-cs2 px-4 py-2 text-sm font-semibold text-bg hover:bg-cs2b"
              >
                {c.label}
              </a>
            ))}
          </div>

          <div className="mt-5">
            <SocialLinks links={links} />
          </div>

          <div className="mt-5 text-xs text-muted">
          </div>
        </Card>

        <fieldset className="relative rounded-xl2 border border-border/50 p-0 shadow-soft">
          <legend className="ml-4 px-2 text-xs text-muted">Médias</legend>
          
        <motion.div className="relative overflow-hidden rounded-xl2 border border-border/50 shadow-soft">
          {videos?.length ? (
            <video
              className="h-full min-h-[280px] w-full object-cover"
              src={videos[0]}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
              e.currentTarget.volume = 0.15;
            }}
            onCanPlay={(e) => {
              e.currentTarget.volume = 0.15;
            }}
            />
          ) : (
            <>
              <img
                src={cover}
                alt="Cover"
                className="h-full min-h-[280px] w-full object-cover"
              />
              {/* Overlay UNIQUEMENT sur l'image */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/55 to-transparent" />
            </>
          )}
        </motion.div>

        </fieldset>


      </div>
    </section>
  );
}
