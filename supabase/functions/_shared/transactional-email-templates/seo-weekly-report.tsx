import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface QueryRow { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface PageRow { page: string; clicks: number; ctr: number; position: number }
interface Props {
  startDate: string
  endDate: string
  summary: { clicks: number; impressions: number; ctr: number; position: number }
  leadsTotal: number
  conversionRate: number
  queryRows: QueryRow[]
  pageRows: PageRow[]
}

const fmt = (n: number) => new Intl.NumberFormat('ro-RO').format(Math.round(n || 0))

const SeoWeeklyReport = ({
  startDate = '', endDate = '',
  summary = { clicks: 0, impressions: 0, ctr: 0, position: 0 },
  leadsTotal = 0, conversionRate = 0,
  queryRows = [], pageRows = [],
}: Partial<Props>) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Raport SEO săptămânal · {fmt(summary.clicks)} clickuri · {conversionRate}% conv.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={h1}>📈 Raport SEO săptămânal</Heading>
          <Text style={subtitle}>{startDate} → {endDate} · realtrust.ro</Text>
        </Section>
        <Section style={statsGrid}>
          <Text style={statLabel}>Clickuri</Text>
          <Text style={statValue}>{fmt(summary.clicks)}</Text>
          <Text style={statLabel}>Impresii</Text>
          <Text style={statValue}>{fmt(summary.impressions)}</Text>
          <Text style={statLabel}>CTR mediu</Text>
          <Text style={statValue}>{summary.ctr}%</Text>
          <Text style={statLabel}>Poziție medie</Text>
          <Text style={statValue}>{summary.position}</Text>
        </Section>
        <Section style={convBox}>
          <Text style={convLabel}>Conversie SEO → Lead-uri</Text>
          <Text style={convValue}>{fmt(leadsTotal)} lead-uri din {fmt(summary.clicks)} clickuri · {conversionRate}%</Text>
        </Section>
        <Heading as="h2" style={h2}>🔎 Top căutări</Heading>
        {queryRows.slice(0, 10).map((q, i) => (
          <Text key={`q-${i}`} style={row}>{q.query} — {fmt(q.clicks)} clk · CTR {q.ctr}% · poz. {q.position}</Text>
        ))}
        <Heading as="h2" style={h2}>📄 Top pagini</Heading>
        {pageRows.slice(0, 10).map((p, i) => (
          <Text key={`p-${i}`} style={row}>{p.page.replace(/^https?:\/\/[^/]+/, '')} — {fmt(p.clicks)} clk · CTR {p.ctr}%</Text>
        ))}
        <Text style={footer}>Generat automat luni dimineața · realtrust.ro/admin</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SeoWeeklyReport,
  subject: (d: Record<string, any>) =>
    `📈 Raport SEO săptămânal · ${fmt(d?.summary?.clicks || 0)} clickuri · ${d?.conversionRate || 0}% conv.`,
  to: 'adicosti@gmail.com',
  displayName: 'SEO · Raport săptămânal',
  previewData: {
    startDate: '2026-05-09', endDate: '2026-05-16',
    summary: { clicks: 1240, impressions: 38500, ctr: 3.22, position: 12.4 },
    leadsTotal: 18, conversionRate: 1.45,
    queryRows: [{ query: 'apartamente timisoara', clicks: 120, impressions: 3200, ctr: 3.75, position: 6.1 }],
    pageRows: [{ page: 'https://realtrust.ro/', clicks: 540, ctr: 4.2, position: 5.1 }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '0', maxWidth: '680px', margin: '0 auto' }
const headerSection = { background: '#0f1b3d', padding: '24px', color: '#ffffff' }
const h1 = { margin: '0', fontSize: '20px', color: '#ffffff' }
const subtitle = { margin: '4px 0 0', opacity: 0.85, fontSize: '13px', color: '#ffffff' }
const statsGrid = { padding: '20px 24px 8px' }
const statLabel = { fontSize: '11px', color: '#6b7280', margin: '8px 0 2px' }
const statValue = { fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }
const convBox = { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '14px 16px', margin: '12px 24px 20px' }
const convLabel = { fontSize: '12px', color: '#92400e', margin: '0 0 4px' }
const convValue = { fontSize: '16px', fontWeight: 700, color: '#c2410c', margin: 0 }
const h2 = { fontSize: '15px', margin: '24px 24px 8px', color: '#0f172a' }
const row = { fontSize: '13px', color: '#1f2937', margin: '4px 24px', lineHeight: '1.5' }
const footer = { margin: '24px', fontSize: '12px', color: '#6b7280' }
