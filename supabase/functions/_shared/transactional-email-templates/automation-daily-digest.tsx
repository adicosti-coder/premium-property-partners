/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  date: string
  pending_approvals: number
  jobs_failed: number
  jobs_disabled_self_healing: number
  agency_suspects_24h: number
  high_score_leads_24h: number
  duplicates_marked_24h: number
  seo_drafts_pending: number
  seo_anomalies_24h: number
  pm_leads_24h?: number
  pm_leads_airbnb_24h?: number
  pm_leads_booking_24h?: number
  pm_leads_avg_score?: number
  pm_leads_admin_url?: string
  properties_24h?: number
  top_failures: Array<{ job_key: string; error: string; consecutive_failures: number }>
  top_approvals: Array<{ action_type: string; severity: string; created_at: string }>
}

const Stat: React.FC<{ label: string; value: number; warn?: boolean }> = ({ label, value, warn }) => (
  <Section style={{ display: 'inline-block', minWidth: 120, padding: 10, marginRight: 8, marginBottom: 8, backgroundColor: warn && value > 0 ? '#fef2f2' : '#f9fafb', borderRadius: 6, border: `1px solid ${warn && value > 0 ? '#fecaca' : '#e5e7eb'}` }}>
    <Text style={{ fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    <Text style={{ fontSize: 22, fontWeight: 700, color: warn && value > 0 ? '#dc2626' : '#111827', margin: '4px 0 0' }}>{value}</Text>
  </Section>
)

const AutomationDailyDigest: React.FC<Props> = (p) => {
  const hasIssues = p.jobs_failed > 0 || p.jobs_disabled_self_healing > 0 || p.pending_approvals > 0
  return (
    <Html lang="ro">
      <Head />
      <Preview>{`RealTrust Automation • ${p.pending_approvals} aprobări • ${p.high_score_leads_24h} leaduri hot • ${p.jobs_failed} joburi eșuate`}</Preview>
      <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff', padding: 0, margin: 0 }}>
        <Container style={{ maxWidth: 640, margin: '0 auto', padding: '24px 20px' }}>
          <Heading style={{ color: hasIssues ? '#0f1b3d' : '#16a34a', fontSize: 22, margin: '0 0 4px' }}>
            Digest zilnic Automation
          </Heading>
          <Text style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>{p.date} • RealTrust.ro</Text>

          <Heading as="h2" style={{ fontSize: 14, color: '#374151', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Acțiuni de făcut
          </Heading>
          <Stat label="Aprobări pending" value={p.pending_approvals} warn />
          <Stat label="Joburi eșuate" value={p.jobs_failed} warn />
          <Stat label="Auto-disabled" value={p.jobs_disabled_self_healing} warn />

          <Heading as="h2" style={{ fontSize: 14, color: '#374151', margin: '24px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Lead Pipeline (24h)
          </Heading>
          <Stat label="Leaduri hot ≥90" value={p.high_score_leads_24h} />
          <Stat label="Suspecți agenție" value={p.agency_suspects_24h} />
          <Stat label="Duplicate marcate" value={p.duplicates_marked_24h} />

          <Heading as="h2" style={{ fontSize: 14, color: '#374151', margin: '24px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            💼 Prospectare B2B (Short-Term Leads)
          </Heading>
          <Text style={{ fontSize: 13, color: '#374151', margin: '0 0 8px' }}>
            Gazde noi descoperite: <strong>{p.pm_leads_24h ?? 0}</strong>
            {' '}(Airbnb: <strong>{p.pm_leads_airbnb_24h ?? 0}</strong>
            {' '}| Booking: <strong>{p.pm_leads_booking_24h ?? 0}</strong>)
            {' '}| Scor mediu PM: <strong>{p.pm_leads_avg_score ?? 0}%</strong>
          </Text>
          <Text style={{ fontSize: 12, margin: '0 0 4px' }}>
            <a href={p.pm_leads_admin_url || 'https://realtrust.ro/admin?tab=listing-import'} style={{ color: '#0f1b3d', fontWeight: 600 }}>
              → Gestionează PM Leads
            </a>
          </Text>

          <Heading as="h2" style={{ fontSize: 14, color: '#374151', margin: '24px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            SEO (24h)
          </Heading>
          <Stat label="Meta drafts" value={p.seo_drafts_pending} />
          <Stat label="Anomalii score" value={p.seo_anomalies_24h} warn />

          {p.top_failures.length > 0 && (
            <>
              <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />
              <Heading as="h2" style={{ fontSize: 14, color: '#dc2626', margin: '0 0 8px' }}>
                Top eșuări joburi
              </Heading>
              {p.top_failures.map((f, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#374151', margin: '4px 0' }}>
                  <strong>{f.job_key}</strong> — {f.consecutive_failures}× eșuat: {f.error}
                </Text>
              ))}
            </>
          )}

          {p.top_approvals.length > 0 && (
            <>
              <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />
              <Heading as="h2" style={{ fontSize: 14, color: '#374151', margin: '0 0 8px' }}>
                Cele mai recente aprobări
              </Heading>
              {p.top_approvals.map((a, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#374151', margin: '4px 0' }}>
                  <strong>{a.action_type}</strong> ({a.severity}) — {new Date(a.created_at).toLocaleString('ro-RO')}
                </Text>
              ))}
            </>
          )}

          <Hr style={{ margin: '28px 0 12px', borderColor: '#e5e7eb' }} />
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' as const, margin: 0 }}>
            Vizualizează tot la realtrust.ro/admin/automation
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AutomationDailyDigest,
  subject: (d: Record<string, unknown>) => {
    const ph = (d.pending_approvals as number) ?? 0
    const fl = (d.jobs_failed as number) ?? 0
    const flag = ph + fl > 0 ? '🚨 ' : '✅ '
    return `${flag}Automation Digest ${d.date ?? ''} • ${ph} aprobări • ${fl} eșuări`
  },
  displayName: 'Automation Daily Digest',
  previewData: {
    date: '15.05.2026',
    pending_approvals: 3,
    jobs_failed: 1,
    jobs_disabled_self_healing: 0,
    agency_suspects_24h: 7,
    high_score_leads_24h: 4,
    duplicates_marked_24h: 12,
    seo_drafts_pending: 5,
    seo_anomalies_24h: 1,
    pm_leads_24h: 6,
    pm_leads_airbnb_24h: 4,
    pm_leads_booking_24h: 2,
    pm_leads_avg_score: 72,
    pm_leads_admin_url: 'https://realtrust.ro/admin?tab=listing-import',
    top_failures: [
      { job_key: 'lead.auto_classify_agency', error: 'Gateway 429: rate limited', consecutive_failures: 2 },
    ],
    top_approvals: [
      { action_type: 'auto_blacklist_agency', severity: 'critical', created_at: new Date().toISOString() },
    ],
  },
} satisfies TemplateEntry
