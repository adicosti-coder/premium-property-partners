import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface AdminOtpProps {
  code?: string
}

const AdminOtpEmail = ({ code = '------' }: AdminOtpProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Codul tău de acces admin {SITE_NAME}: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>🔐 Cod de acces Admin</Heading>
        <Text style={text}>
          Folosește codul de mai jos pentru a accesa panoul de administrare {SITE_NAME}:
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={muted}>
          Codul expiră în 10 minute. Dacă nu ai solicitat acest cod, ignoră acest email.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Cu stimă, Echipa {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminOtpEmail,
  subject: (data: Record<string, any>) => `Cod acces admin: ${data?.code ?? ''}`.trim(),
  displayName: 'Admin OTP code',
  previewData: { code: '482915' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox = { backgroundColor: '#f4f1e8', borderRadius: '12px', padding: '24px', textAlign: 'center' as const, margin: '24px 0' }
const codeText = { fontSize: '36px', fontWeight: 'bold' as const, letterSpacing: '8px', color: '#1a1f36', margin: '0' }
const muted = { fontSize: '13px', color: '#888', margin: '16px 0 0', textAlign: 'center' as const }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
