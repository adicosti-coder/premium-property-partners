import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid hsl(38 92% 50%)",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  padding: "10px 14px",
};
const labelStyle = { color: "#0f172a", fontWeight: 700 };
const itemStyle = { color: "#0f172a", fontWeight: 600 };

const BLUE = "hsl(217 91% 30%)";
const GOLD = "hsl(38 92% 50%)";
const SLATE = "hsl(215 20% 50%)";

const roiData = [
  { cartier: "Iosefin", regimHotelier: 10.2, chirieClasica: 4.5 },
  { cartier: "Complex Studențesc", regimHotelier: 9.8, chirieClasica: 4.8 },
  { cartier: "Iulius Town", regimHotelier: 9.5, chirieClasica: 4.3 },
  { cartier: "Centru", regimHotelier: 8.1, chirieClasica: 3.9 },
  { cartier: "Fabric", regimHotelier: 9.4, chirieClasica: 4.6 },
  { cartier: "Dumbrăvița", regimHotelier: 8.7, chirieClasica: 4.2 },
];

const yieldData = [
  { tip: "Garsonieră", venit: 1450, costuri: 420, net: 1030 },
  { tip: "2 camere", venit: 2350, costuri: 680, net: 1670 },
  { tip: "3 camere", venit: 3100, costuri: 920, net: 2180 },
  { tip: "Penthouse", venit: 4200, costuri: 1280, net: 2920 },
];

const priceData = [
  { an: 2020, centru: 1550, iosefin: 1280, fabric: 1100, dumbravita: 1050 },
  { an: 2021, centru: 1680, iosefin: 1390, fabric: 1190, dumbravita: 1140 },
  { an: 2022, centru: 1850, iosefin: 1520, fabric: 1310, dumbravita: 1260 },
  { an: 2023, centru: 2050, iosefin: 1680, fabric: 1450, dumbravita: 1390 },
  { an: 2024, centru: 2280, iosefin: 1830, fabric: 1610, dumbravita: 1540 },
  { an: 2025, centru: 2440, iosefin: 1950, fabric: 1730, dumbravita: 1660 },
  { an: 2026, centru: 2580, iosefin: 2060, fabric: 1820, dumbravita: 1750 },
];

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <figure className="my-8 p-4 sm:p-6 rounded-xl border border-border bg-card shadow-sm not-prose">
    <figcaption className="mb-4">
      <h4 className="text-base sm:text-lg font-semibold text-foreground">{title}</h4>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
    </figcaption>
    <div className="w-full h-[320px] sm:h-[380px]">{children}</div>
  </figure>
);

export const RoiByNeighborhoodChart = () => (
  <ChartCard
    title="ROI net anual: Regim Hotelier vs Chirie Clasică (2026)"
    subtitle="Date agregate din portofoliul RealTrust — randament % după management 27% și taxe"
  >
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={roiData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="cartier" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
        <YAxis unit="%" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="regimHotelier" name="Regim Hotelier" fill={GOLD} radius={[6, 6, 0, 0]} />
        <Bar dataKey="chirieClasica" name="Chirie Clasică" fill={BLUE} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

export const MonthlyYieldChart = () => (
  <ChartCard
    title="Yield lunar pe tip de apartament (€)"
    subtitle="Venit brut, costuri operaționale și venit net lunar — regim hotelier Timișoara"
  >
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={yieldData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="tip" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
        <YAxis unit="€" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => `€${v.toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="venit" name="Venit brut" fill={BLUE} radius={[6, 6, 0, 0]} />
        <Bar dataKey="costuri" name="Costuri" fill={SLATE} radius={[6, 6, 0, 0]} />
        <Bar dataKey="net" name="Venit NET" fill={GOLD} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

export const PriceAppreciationChart = () => (
  <ChartCard
    title="Apreciere preț €/mp pe cartiere (2020 → 2026)"
    subtitle="Evoluție preț mediu pe metru pătrat — surse: tranzacții reale + portofoliu RealTrust"
  >
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={priceData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="an" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
        <YAxis unit="€" tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} itemStyle={itemStyle} formatter={(v: number) => `€${v}/mp`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="centru" name="Centru" stroke={GOLD} strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="iosefin" name="Iosefin" stroke={BLUE} strokeWidth={3} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="fabric" name="Fabric" stroke="hsl(160 64% 40%)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="dumbravita" name="Dumbrăvița" stroke={SLATE} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </ChartCard>
);

const TimisoaraInvestmentCharts = {
  RoiByNeighborhood: RoiByNeighborhoodChart,
  MonthlyYield: MonthlyYieldChart,
  PriceAppreciation: PriceAppreciationChart,
};

export default TimisoaraInvestmentCharts;
