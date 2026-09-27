import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string; title?: string; zone?: string; price?: string
  category?: string; url?: string; intro?: string
}

const CALL_URL = 'tel:+40799069256'
const SCHEDULE_URL = 'https://realtrust.ro/contact#programare-apel'

const HotLeadFollowup = ({ name, title, zone, price, category, url, intro }: Props) => {
  const isSale = category === 'vanzare'
  const isRent = category === 'inchiriere' || category === 'hotelier'
  return (
    <Html lang="ro" dir="ltr">
      <Head />
      <Preview>Un apel de 2 minute și vă spunem exact următorii pași</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>RealTrust</Text>
          <Hr style={hr} />
          <Heading style={h1}>{name ? `Bună ziua, ${name}!` : 'Bună ziua!'}</Heading>
          <Text style={text}>{intro || 'Mulțumim pentru interes! Ca să nu pierdem momentul, vă propun un apel scurt, de 2 minute.'}</Text>
          {(title || zone || price) ? (
            <Section style={card}>
              <Text style={cardTitle}>{title || 'Proprietatea discutată'}</Text>
              {zone ? <Text style={row}>Zona: {zone}, Timișoara</Text> : null}
              {price ? <Text style={row}>Preț: {price}</Text> : null}
            </Section>
          ) : null}
          <Text style={text}>
            {isSale
              ? 'Pentru vânzare: evaluare gratuită a prețului de piață, cumpărători calificați și dosar complet până la semnare.'
              : isRent
                ? 'Pentru închiriere: Regim Hotelier (ApArt Hotel), randament net estimat ~9,4%/an, administrare RealTrust 15-20%, 100% pasiv pentru dvs.'
                : 'Vânzare Asistată cu evaluare gratuită sau Regim Hotelier cu randament net estimat ~9,4%/an — alegem împreună varianta potrivită.'}
          </Text>
          <Button style={button} href={CALL_URL}>Sunați acum (2 minute)</Button>
          <Text style={small}>sau <a href={SCHEDULE_URL} style={link}>alegeți ora la care vă sunăm noi</a></Text>
          {url ? <Text style={small}><a href={url} style={link}>Vezi detaliile anunțului</a></Text> : null}
          <Text style={footer}>Andrei · RealTrust Timișoara · info@realtrust.ro</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: HotLeadFollowup,
  subject: (d: Record<string, any>) => `Un apel de 2 minute${d?.title ? ` despre ${d.title}` : ''} — RealTrust`,
  displayName: 'Follow-up Hot Lead (apel 2 minute)',
  previewData: { name: 'Maria', title: 'Apartament 2 camere', zone: 'Cetate', price: '99500 EUR', category: 'vanzare', url: 'https://realtrust.ro' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const logo = { fontSize: '22px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }
const hr = { borderColor: '#D4AF37', margin: '12px 0 20px' }
const h1 = { fontSize: '20px', color: '#111827' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const small = { fontSize: '14px', color: '#374151', margin: '4px 0' }
const link = { color: '#1e3a8a', textDecoration: 'underline' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px', margin: '16px 0' }
const cardTitle = { fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 8px' }
const row = { fontSize: '14px', color: '#374151', margin: '2px 0' }
const button = { backgroundColor: '#D4AF37', color: '#111827', padding: '12px 22px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block', margin: '8px 0 12px' }
const footer = { fontSize: '12px', color: '#6b7280', marginTop: '24px' }
