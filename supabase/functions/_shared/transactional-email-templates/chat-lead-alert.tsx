import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { message?: string; page?: string; email?: string; phone?: string; source?: string }

const ChatLeadAlert = ({ message, page, email, phone, source }: Props) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Vizitator nou — sună-l în 2 minute</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>RealTrust · Alertă lead</Text>
        <Hr style={hr} />
        <Heading style={h1}>{source === 'contact' ? 'Cerere de apel de pe pagina Contact' : 'Mesaj nou în chatul premium'}</Heading>
        <Section style={card}>
          <Text style={row}><b>Mesaj:</b> {message || '—'}</Text>
          {page ? <Text style={row}><b>Pagina:</b> {page}</Text> : null}
          {phone ? <Text style={row}><b>Telefon:</b> {phone}</Text> : null}
          {email ? <Text style={row}><b>E-mail:</b> {email}</Text> : null}
        </Section>
        <Text style={text}>Propune un apel de 2 minute cât interesul e fierbinte.</Text>
        <Button style={button} href="https://realtrust.ro/admin?tab=leads">Deschide Lead Manager</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ChatLeadAlert,
  subject: (d: Record<string, any>) => d?.source === 'contact' ? 'Cerere de apel — pagina Contact' : 'Mesaj nou în chatul premium',
  to: 'info@realtrust.ro',
  displayName: 'Alertă internă: lead chat / contact',
  previewData: { message: 'Vreau o evaluare pentru apartamentul meu', page: '/cartiere', phone: '07xx', source: 'chat' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const logo = { fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }
const hr = { borderColor: '#D4AF37', margin: '12px 0 20px' }
const h1 = { fontSize: '19px', color: '#111827' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px', margin: '16px 0' }
const row = { fontSize: '14px', color: '#374151', margin: '3px 0' }
const button = { backgroundColor: '#1e3a8a', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '8px 0' }
