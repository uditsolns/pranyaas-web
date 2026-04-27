import { useMemo, useState } from "react";
import { Quote } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, Eye, Pencil, Trash2, Loader2, AlertCircle, Quote as QuoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TablePagination } from "@/components/TablePagination";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useApiList, useApiCreate, useApiUpdate, useApiDelete } from "@/hooks/useApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { canEdit } from "@/lib/permissions";
import { QuoteCard } from "@/components/QuoteCard";

const emptyQuote: Partial<Quote> = {
  quote: "",
  type: "anytime",
  said_by: "",
};

const quoteTypes = ["anytime", "morning", "afternoon", "evening", "night"];

export default function QuotesPage() {
  const { role } = useAuth();
  const hasEdit = canEdit(role, "quotes");
  const { data: quotes = [], isLoading, isError, error } = useApiList<Quote>("quotes", "/quotes");
  const createMutation = useApiCreate<Quote>("quotes", "/quotes", "Quote");
  const updateMutation = useApiUpdate<Quote>("quotes", "/quotes", "Quote");
  const deleteMutation = useApiDelete("quotes", "/quotes", "Quote");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Partial<Quote> | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const filtered = useMemo(() => quotes.filter((item) => {
    const haystack = `${item.quote} ${item.said_by} ${item.type}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  }), [filterType, quotes, search]);

  const { page, setPage, totalPages, paged, total, from, to } = usePagination(filtered);

  const openCreate = () => {
    setEditingQuote({ ...emptyQuote });
    setDialogOpen(true);
  };

  const openEdit = (quote: Quote) => {
    setEditingQuote({ ...quote });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingQuote?.quote?.trim()) return;

    const payload = {
      quote: editingQuote.quote.trim(),
      type: editingQuote.type || "anytime",
      said_by: editingQuote.said_by?.trim() || "Unknown",
    };

    if (editingQuote.id) {
      updateMutation.mutate(
        { id: editingQuote.id, data: payload },
        { onSuccess: () => setDialogOpen(false) },
      );
      return;
    }

    createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
  };

  const handleDelete = () => {
    if (deleteTarget !== null) {
      deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
    }
  };

  const updateField = (field: keyof Quote, value: string) => {
    setEditingQuote((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quotes"
          subtitle="Quotes management"
          actionLabel={hasEdit ? "Create Quote" : undefined}
          onAction={hasEdit ? openCreate : undefined}
        />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Unable to load quotes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(error as Error)?.message || "The quotes API is currently unavailable."}
              </p>
            </div>
          </div>
        </div>
        <QuoteCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        subtitle={`${total} total quotes`}
        actionLabel={hasEdit ? "Create Quote" : undefined}
        onAction={hasEdit ? openCreate : undefined}
      />

      <QuoteCard />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <Select
          value={filterType}
          onValueChange={(value) => {
            setFilterType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {quoteTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="p-4 text-left text-xs font-medium text-muted-foreground">Quote</th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground">Said By</th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground">Created</th>
                <th className="p-4 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No quotes found" />
                  </td>
                </tr>
              ) : (
                paged.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="p-4">
                      <div className="max-w-xl">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.quote}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-foreground">{item.said_by || "Unknown"}</td>
                    <td className="p-4 text-sm capitalize text-foreground">{item.type || "anytime"}</td>
                    <td className="p-4 text-sm text-foreground">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setViewingQuote(item); setDetailOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        {hasEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        )}
                        {hasEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} />
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {viewingQuote && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border/50 bg-secondary/20 p-5">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <QuoteIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Selected Quote</span>
                </div>
                <p className="text-base leading-7 text-foreground">"{viewingQuote.quote}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Said By</p>
                  <p className="text-sm font-medium">{viewingQuote.said_by || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium capitalize">{viewingQuote.type || "anytime"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(viewingQuote.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated At</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(viewingQuote.updated_at)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {hasEdit && (
                  <Button
                    onClick={() => {
                      setDetailOpen(false);
                      openEdit(viewingQuote);
                    }}
                  >
                    Edit Quote
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuote?.id ? "Edit Quote" : "Create Quote"}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Quote Text <span className="text-destructive">*</span></Label>
              <Textarea
                value={editingQuote?.quote || ""}
                onChange={(e) => updateField("quote", e.target.value)}
                rows={5}
                placeholder="Write the quote here..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editingQuote?.type || "anytime"} onValueChange={(value) => updateField("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Said By</Label>
                <Input
                  value={editingQuote?.said_by || ""}
                  onChange={(e) => updateField("said_by", e.target.value)}
                  placeholder="Author or source"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingQuote?.id ? "Update" : "Create"} Quote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Quote?"
      />
    </div>
  );
}
