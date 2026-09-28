import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Line { who: string; text: string; at?: string }
interface Props { lines?: Line[]; pageTitle?: string; pageUrl?: string; leadName?: string }

const Summary = ({ lines = [], pageTitle, pageUrl, leadName }: Props) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Rezumat discuție chat premium</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>RealTrust · Rezumat discuție</Text>
        <Hr style={hr} />
        <Heading style={h1}>{leadName ? `Discuție cu ${leadName}` : 'Discuție în chatul premium'}</Heading>
        {pageTitle ? <Text style={row}><b>Anunț:</b> {pageTitle}{pageUrl ? ` — ${pageUrl}` : ''}</Text> : null}
        <Section style={card}>
          {lines.map((l, i) => (
            <Text key={i} style={row}><b>{l.who}:</b> {l.text}</Text>
          ))}
        </Section>
        <Button style={button} href="https://realtrust.ro/admin?tab=leads">Deschide Lead Manager</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Summary,
  subject: (d: Record<string, any>) => d?.leadName ? `Rezumat discuție chat — ${d.leadName}` : 'Rezumat discuție chat premium',
  to: 'info@realtrust.ro',
  displayName: 'Rezumat intern discuție chat',
  previewData: { leadName: 'Maria', pageTitle: 'Apartament 2 camere Iosefin', lines: [{ who: 'Vizitator', text: 'Bună, e disponibil?' }, { who: 'Andrei', text: 'Da! Vă pot suna 2 minute?' }] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const logo = { fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }
const hr = { borderColor: '#D4AF37', margin: '12px 0 20px' }
const h1 = { fontSize: '19px', color: '#111827' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px', margin: '16px 0' }
const row = { fontSize: '14px', lineHeight: '20px', color: '#374151', margin: '4px 0' }
const button = { backgroundColor: '#1e3a8a', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '8px 0' }
