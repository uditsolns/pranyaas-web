import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCSV, exportPDF } from "@/lib/export";

interface ExportButtonProps {
  filename: string;
  title: string;
  columns: { key: string; label: string }[];
  data: Record<string, any>[];
}

export function ExportButton({ filename, title, columns, data }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(filename, columns, data)}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(title, columns, data)}>
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
