import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface Report {
  id: string;
  title: string;
}

interface RecentlyCompletedReportsProps {
  reports: Report[];
}

export function RecentlyCompletedReports({
  reports,
}: RecentlyCompletedReportsProps) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-3">
          <Eye className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No documented rescues yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {reports.map((report) => (
        <Card
          key={report.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors border-border bg-card"
        >
          <CardContent className="flex items-center justify-between px-8 py-3">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-blue-500/20 p-2">
                <Eye className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">
                  {report.id}
                </p>
                <p className="text-xs text-muted-foreground">{report.title}</p>
              </div>
            </div>
            <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
