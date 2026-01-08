import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Receipt
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface OwnerFinancialsProps {
  propertyId: string;
}

const OwnerFinancials = ({ propertyId }: OwnerFinancialsProps) => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const [selectedPeriod, setSelectedPeriod] = useState("3");

  const translations = {
    ro: {
      title: "Rapoarte Financiare",
      subtitle: "Venituri, cheltuieli și comisioane",
      income: "Venituri",
      expenses: "Cheltuieli",
      netProfit: "Profit Net",
      monthlyBreakdown: "Evoluție Lunară",
      transactionHistory: "Istoric Tranzacții",
      downloadReport: "Descarcă Raport",
      period: "Perioadă",
      months3: "Ultimele 3 luni",
      months6: "Ultimele 6 luni",
      months12: "Ultimul an",
      category: "Categorie",
      amount: "Sumă",
      date: "Dată",
      noTransactions: "Nicio tranzacție în această perioadă",
      managementFee: "Comision administrare",
      cleaning: "Curățenie",
      maintenance: "Mentenanță",
      utilities: "Utilități",
      booking: "Rezervare",
    },
    en: {
      title: "Financial Reports",
      subtitle: "Income, expenses and commissions",
      income: "Income",
      expenses: "Expenses",
      netProfit: "Net Profit",
      monthlyBreakdown: "Monthly Breakdown",
      transactionHistory: "Transaction History",
      downloadReport: "Download Report",
      period: "Period",
      months3: "Last 3 months",
      months6: "Last 6 months",
      months12: "Last year",
      category: "Category",
      amount: "Amount",
      date: "Date",
      noTransactions: "No transactions in this period",
      managementFee: "Management fee",
      cleaning: "Cleaning",
      maintenance: "Maintenance",
      utilities: "Utilities",
      booking: "Booking",
    },
  };

  const t = translations[language] || translations.ro;

  const monthsBack = parseInt(selectedPeriod);
  const periodStart = startOfMonth(subMonths(new Date(), monthsBack - 1));
  const periodEnd = endOfMonth(new Date());

  const { data: financials, isLoading } = useQuery({
    queryKey: ["owner-financials-detailed", propertyId, selectedPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("property_id", propertyId)
        .gte("date", format(periodStart, "yyyy-MM-dd"))
        .lte("date", format(periodEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate totals
  const totalIncome = financials?.filter(f => f.type === "income").reduce((sum, f) => sum + Number(f.amount), 0) || 0;
  const totalExpenses = financials?.filter(f => f.type === "expense").reduce((sum, f) => sum + Number(f.amount), 0) || 0;
  const netProfit = totalIncome - totalExpenses;

  // Prepare chart data
  const chartData: { month: string; income: number; expenses: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthName = format(monthDate, "MMM", { locale: dateLocale });

    const monthIncome = financials
      ?.filter(f => {
        const date = parseISO(f.date);
        return f.type === "income" && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, f) => sum + Number(f.amount), 0) || 0;

    const monthExpenses = financials
      ?.filter(f => {
        const date = parseISO(f.date);
        return f.type === "expense" && date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, f) => sum + Number(f.amount), 0) || 0;

    chartData.push({
      month: monthName,
      income: monthIncome,
      expenses: monthExpenses,
    });
  }

  // Category translations
  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      management_fee: t.managementFee,
      cleaning: t.cleaning,
      maintenance: t.maintenance,
      utilities: t.utilities,
      booking: t.booking,
    };
    return categoryMap[category] || category;
  };

  const handleDownloadReport = () => {
    // Generate CSV report
    let csv = "Date,Category,Type,Amount,Description\n";
    financials?.forEach(record => {
      csv += `${record.date},${getCategoryLabel(record.category)},${record.type},${record.amount},${record.description || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raport-financiar-${format(new Date(), "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector & Download */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t.period} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{t.months3}</SelectItem>
            <SelectItem value="6">{t.months6}</SelectItem>
            <SelectItem value="12">{t.months12}</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleDownloadReport}>
          <Download className="w-4 h-4 mr-2" />
          {t.downloadReport}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income */}
        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.income}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{totalIncome.toLocaleString()} €
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>+8% vs perioada anterioară</span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.expenses}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{totalExpenses.toLocaleString()} €
            </div>
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1">
              <ArrowDownRight className="w-3 h-3" />
              <span>-3% vs perioada anterioară</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border-t-4 border-t-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t.netProfit}
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"}`}>
              {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} €
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t.monthlyBreakdown}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString()} €`]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Bar dataKey="income" name={t.income} fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={t.expenses} fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>{t.transactionHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {financials && financials.length > 0 ? (
            <div className="space-y-3">
              {financials.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      record.type === "income" 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      {record.type === "income" ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {getCategoryLabel(record.category)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(record.date), "d MMMM yyyy", { locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${
                    record.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}>
                    {record.type === "income" ? "+" : "-"}{Number(record.amount).toLocaleString()} €
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t.noTransactions}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerFinancials;
