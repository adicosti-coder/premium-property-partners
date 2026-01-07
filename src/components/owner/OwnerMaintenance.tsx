import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wrench, 
  Image as ImageIcon, 
  FileText, 
  Calendar,
  Euro,
  ExternalLink
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";

interface OwnerMaintenanceProps {
  propertyId: string;
}

const OwnerMaintenance = ({ propertyId }: OwnerMaintenanceProps) => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const translations = {
    ro: {
      title: "Jurnal de Mentenanță",
      subtitle: "Istoric intervenții și reparații",
      totalCost: "Cost Total",
      thisYear: "în acest an",
      interventions: "Intervenții",
      completed: "finalizate",
      noRecords: "Nicio înregistrare de mentenanță",
      noRecordsDesc: "Intervențiile și reparațiile vor fi afișate aici.",
      viewImage: "Vezi imagine",
      viewInvoice: "Vezi factură",
      cost: "Cost",
      date: "Dată",
    },
    en: {
      title: "Maintenance Journal",
      subtitle: "Intervention and repair history",
      totalCost: "Total Cost",
      thisYear: "this year",
      interventions: "Interventions",
      completed: "completed",
      noRecords: "No maintenance records",
      noRecordsDesc: "Interventions and repairs will be displayed here.",
      viewImage: "View image",
      viewInvoice: "View invoice",
      cost: "Cost",
      date: "Date",
    },
  };

  const t = translations[language] || translations.ro;

  const { data: records, isLoading } = useQuery({
    queryKey: ["owner-maintenance", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("property_id", propertyId)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalCost = records?.reduce((sum, r) => sum + Number(r.cost), 0) || 0;
  const totalInterventions = records?.length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.totalCost}
            </CardTitle>
            <Euro className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalCost.toLocaleString()} RON
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.thisYear}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.interventions}
            </CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {totalInterventions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.completed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {t.title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </CardHeader>
        <CardContent>
          {records && records.length > 0 ? (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">
                          {record.title}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {Number(record.cost).toLocaleString()} RON
                        </Badge>
                      </div>
                      
                      {record.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {record.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(record.date), "d MMMM yyyy", { locale: dateLocale })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {record.image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(record.image_url!, "_blank")}
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
                          {t.viewImage}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                      {record.invoice_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(record.invoice_url!, "_blank")}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {t.viewInvoice}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                {t.noRecords}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.noRecordsDesc}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerMaintenance;
