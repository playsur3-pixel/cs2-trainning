export function TopNav() {
  return (
    <div className="sticky top-0 z-40 border-b border-border/40 bg-bg/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#top" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cs2 shadow-[0_0_18px_rgba(227,134,23,.8)]" />
          <span className="font-semibold tracking-tight">playSURE Monitoring</span>
        </a>
      </div>
    </div>
  );
}
