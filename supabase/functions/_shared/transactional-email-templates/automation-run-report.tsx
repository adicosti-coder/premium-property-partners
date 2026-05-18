import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface RunRow { job_key: string; status: string; duration_ms: number; error?: string }
interface Props {
  ran: number
  ok: number
  failed: number
  rows: RunRow[]
  fixes: string[]
  triggered_at?: string
}

const AutomationRunReport = ({ ran = 0, ok = 0, failed = 0, rows = [], fixes = [], triggered_at = '' }: Props) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Raport rulare automatizări — {ok}/{ran} succese, {failed} eșecuri</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🤖 Raport Automation Control Center</Heading>
        <Text style={meta}>{triggered_at} · {SITE_NAME}</Text>

        <Section style={summary}>
          <Text style={statLine}>
            <strong style={{ color: '#0c2340' }}>{ran}</strong> joburi rulate ·{' '}
            <strong style={{ color: '#16a34a' }}>{ok} OK</strong> ·{' '}
            <strong style={{ color: '#dc2626' }}>{failed} eșecuri</strong>
          </Text>
        </Section>

        <Heading as="h2" style={h2}>Detalii rulaje</Heading>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Job</th>
              <th style={th}>Status</th>
              <th style={th}>Durată</th>
              <th style={th}>Eroare</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.job_key}>
                <td style={tdMono}>{r.job_key}</td>
                <td style={{ ...td, color: r.status === 'success' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.status}</td>
                <td style={td}>{r.duration_ms}ms</td>
                <td style={tdErr}>{r.error || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {fixes.length > 0 && (
          <>
            <Heading as="h2" style={h2}>🔧 Corecții aplicate</Heading>
            <ul style={ul}>
              {fixes.map((f, i) => <li key={i} style={li}>{f}</li>)}
            </ul>
          </>
        )}

        <Text style={footer}>Vezi detalii complete în Admin → Automation Control Center.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AutomationRunReport,
  subject: (d: Record<string, any>) => `🤖 Automatizări: ${d?.ok ?? 0}/${d?.ran ?? 0} OK · ${d?.failed ?? 0} eșecuri`,
  displayName: 'Automation Run Report',
  previewData: { ran: 3, ok: 2, failed: 1, rows: [{ job_key: 'demo', status: 'success', duration_ms: 100 }], fixes: ['Exemplu'] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '720px', margin: '0 auto' }
const h1 = { fontSize: '22px', color: '#0c2340', margin: '0 0 4px' }
const h2 = { fontSize: '15px', color: '#0c2340', margin: '24px 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const meta = { fontSize: '12px', color: '#666', margin: '0 0 16px' }
const summary = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', margin: '12px 0' }
const statLine = { fontSize: '14px', margin: 0, color: '#334155' }
const table = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '12px', border: '1px solid #e2e8f0' }
const th = { textAlign: 'left' as const, padding: '8px 10px', background: '#f1f5f9', color: '#475569', fontSize: '11px', textTransform: 'uppercase' as const, borderBottom: '1px solid #e2e8f0' }
const td = { padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }
const tdMono = { ...td, fontFamily: 'monospace', fontSize: '11px', color: '#0c2340' }
const tdErr = { ...td, color: '#dc2626', fontSize: '11px', maxWidth: '260px', wordBreak: 'break-word' as const }
const ul = { paddingLeft: '20px', margin: '8px 0' }
const li = { fontSize: '13px', color: '#334155', marginBottom: '6px' }
const footer = { fontSize: '11px', color: '#94a3b8', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }
