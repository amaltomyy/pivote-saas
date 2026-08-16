import { useMemo, useState } from "react";
import { ImageIcon, X } from "lucide-react";

export type GalleryItem = {
  id: string;
  title: string;
  path: string;
  url?: string | undefined;
  date: string;
};

export function ProofGallery({
  items,
  onClose,
  onOpen,
}: {
  items: GalleryItem[];
  onClose: () => void;
  onOpen: (item: GalleryItem) => void;
}) {
  const [range, setRange] = useState<"week" | "month">("week");

  const filtered = useMemo(() => {
    const cutoff = Date.now() - (range === "week" ? 7 : 30) * 86_400_000;
    return items
      .filter((i) => new Date(i.date).getTime() >= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, range]);

  const groups = useMemo(() => {
    const map = new Map<string, GalleryItem[]>();
    for (const item of filtered) {
      const key = new Date(item.date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <button
        aria-label="Close gallery"
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="panel-card relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black text-foreground">Wall of Wins</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} AI-verified proof{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-glass-border p-0.5">
              {(["week", "month"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`h-8 rounded-full px-3 text-xs font-semibold capitalize transition ${
                    range === r ? "bg-teal text-white" : "text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {groups.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-glass-border py-14 text-sm text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
              No verified proof in this period yet.
            </div>
          ) : (
            groups.map(([day, dayItems]) => (
              <section key={day} className="mb-5">
                <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {day}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {dayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpen(item)}
                      className="group overflow-hidden rounded-2xl border border-glass-border bg-muted text-left"
                    >
                      <span className="block aspect-square w-full overflow-hidden">
                        {item.url ? (
                          <img
                            src={item.url}
                            alt={`Verified proof for ${item.title}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-xs text-muted-foreground">
                            …
                          </span>
                        )}
                      </span>
                      <span className="block truncate px-2 py-2 text-xs text-foreground">
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
