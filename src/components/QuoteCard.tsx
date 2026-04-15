import { useMemo } from "react";
import { Quote as QuoteIcon, Sparkles } from "lucide-react";
import { useApiGet } from "@/hooks/useApi";
import { Quote } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface QuoteCardProps {
  title?: string;
}

function normalizeQuoteResponse(data: unknown): Quote | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    return (data[0] as Quote) || null;
  }

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (record.data && typeof record.data === "object") {
      return normalizeQuoteResponse(record.data);
    }

    if (typeof record.quote === "string") {
      return record as unknown as Quote;
    }
  }

  return null;
}

export function QuoteCard({ title = "Quote of the Moment" }: QuoteCardProps) {
  const { data, isLoading, isError } = useApiGet<unknown>("quotes-time", "/quotes-time");

  const quote = useMemo(() => normalizeQuoteResponse(data), [data]);

  if (isLoading) {
    return <Skeleton className="h-44 rounded-xl" />;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 card-shadow">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute left-0 bottom-0 h-20 w-20 rounded-full bg-accent/15 blur-2xl" />

      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <QuoteIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">Fresh motivation from the API</p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        {isError || !quote ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-4">
            <p className="text-sm text-muted-foreground">Quote is not available right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <blockquote className="text-base font-medium leading-7 text-foreground">
              "{quote.quote}"
            </blockquote>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{quote.said_by || "Unknown"}</span>
              <span className="text-border">&bull;</span>
              <span className="capitalize">{quote.type || "anytime"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
