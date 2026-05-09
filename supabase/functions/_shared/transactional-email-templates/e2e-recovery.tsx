/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  test_type: string
  initial_error: string
  recovered_at: string
  duration_ms?: number
}

const E2ERecovery: React.FC<Props> = ({ test_type, initial_error, recovered_at, duration_ms }) => (
  <Html>
    <Head />
    <Preview>✅ Recovery: testul {test_type} a trecut la retry</Preview>
    <Body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f6f6f6', padding: 20 }}>
      <Container style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, maxWidth: 600 }}>
        <Heading style={{ color: '#16a34a', fontSize: 22, margin: 0 }}>
          ✅ Auto-recovery: {test_type.toUpperCase()}
        </Heading>
        <Text style={{ color: '#666', marginTop: 4 }}>RealTrust • Notificare recovery test E2E</Text>
        <Hr style={{ margin: '20px 0' }} />
        <Text>
          Testul <strong>{test_type}</strong> a eșuat inițial, dar a trecut la retry-ul automat de 10 minute.
          Problema pare a fi temporară și s-a rezolvat de la sine.
        </Text>
        <Text><strong>Recuperare:</strong> {recovered_at}{duration_ms ? ` (${duration_ms}ms)` : ''}</Text>
        <Text><strong>Eroare inițială:</strong></Text>
        <pre style={{ background: '#f3f4f6', padding: 12, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
          {initial_error || '(fără mesaj)'}
        </pre>
        <Hr style={{ margin: '20px 0' }} />
        <Text style={{ fontSize: 12, color: '#999' }}>
          Dacă astfel de recovery-uri devin frecvente, verifică dashboard-ul System Health pentru tendințe.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: E2ERecovery,
  subject: (data: Record<string, any>) => `✅ RealTrust • Recovery ${String(data?.test_type || '').toUpperCase()} E2E`,
  displayName: 'E2E Auto-Recovery Notification',
  previewData: {
    test_type: 'voice',
    initial_error: 'HTTP 500: Twilio temporary outage',
    recovered_at: new Date().toLocaleString('ro-RO'),
    duration_ms: 1240,
  },
}
