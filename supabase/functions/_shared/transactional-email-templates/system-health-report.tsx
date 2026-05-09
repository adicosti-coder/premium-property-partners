/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  date: string
  all_ok: boolean
  errors: string[]
  summary: {
    cron_runs_24h: number
    cron_failures: number
    e2e_failures: number
    invalid_keys: string[]
    avg_voice_latency_ms: number | null
    voice_calls_24h: number
  }
}

const SystemHealthReport: React.FC<Props> = ({ date, all_ok, errors, summary }) => (
  <Html>
    <Head />
    <Preview>{all_ok ? '✅ All systems operational' : `⚠️ ${errors.length} probleme detectate`}</Preview>
    <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f6f6f6', padding: '20px' }}>
      <Container style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, maxWidth: 600 }}>
        <Heading style={{ color: all_ok ? '#16a34a' : '#dc2626', fontSize: 22, margin: 0 }}>
          {all_ok ? '✅ All systems operational' : '🚨 Probleme detectate'}
        </Heading>
        <Text style={{ color: '#666', marginTop: 4 }}>RealTrust • Raport zilnic sistem • {date}</Text>
        <Hr style={{ margin: '20px 0' }} />

        {!all_ok && (
          <Section style={{ backgroundColor: '#fef2f2', padding: 16, borderRadius: 6, marginBottom: 20 }}>
            <Text style={{ fontWeight: 600, color: '#991b1b', margin: 0 }}>Probleme:</Text>
            {errors.map((e, i) => (
              <Text key={i} style={{ color: '#7f1d1d', margin: '4px 0' }}>• {e}</Text>
            ))}
          </Section>
        )}

        <Heading as="h3" style={{ fontSize: 16, marginBottom: 8 }}>Sumar 24h</Heading>
        <Text style={{ margin: '4px 0' }}>• Joburi cron rulate: <strong>{summary.cron_runs_24h}</strong> ({summary.cron_failures} eșuate)</Text>
        <Text style={{ margin: '4px 0' }}>• Teste E2E eșuate: <strong>{summary.e2e_failures}</strong></Text>
        <Text style={{ margin: '4px 0' }}>• Chei externe invalide: <strong>{summary.invalid_keys.length ? summary.invalid_keys.join(', ') : 'niciuna'}</strong></Text>
        <Text style={{ margin: '4px 0' }}>
          • Apeluri voce 24h: <strong>{summary.voice_calls_24h}</strong>
          {summary.avg_voice_latency_ms !== null && <> (latență medie {summary.avg_voice_latency_ms}ms)</>}
        </Text>

        <Hr style={{ margin: '20px 0' }} />
        <Text style={{ fontSize: 12, color: '#999' }}>
          Acest raport este trimis automat zilnic la 09:00. Configurabil din Admin → System Health.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: SystemHealthReport,
  subject: (data: Record<string, any>) =>
    data?.all_ok ? `✅ RealTrust • All systems operational • ${data?.date}` : `🚨 RealTrust • ${(data?.errors?.length ?? 0)} probleme • ${data?.date}`,
  displayName: 'System Health Daily Report',
  previewData: {
    date: '09/05/2026',
    all_ok: true,
    errors: [],
    summary: { cron_runs_24h: 96, cron_failures: 0, e2e_failures: 0, invalid_keys: [], avg_voice_latency_ms: 1042, voice_calls_24h: 12 },
  },
}
