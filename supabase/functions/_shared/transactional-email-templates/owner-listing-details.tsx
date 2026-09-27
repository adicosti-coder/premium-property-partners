import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string; title?: string; zone?: string; price?: string
  rooms?: number | null; size?: number | null; category?: string; url?: string
}

const OwnerListingDetails = ({ name, title, zone, price, rooms, size, category, url }: Props) => {
  const isSale = category === 'vanzare'
  return (
    <Html lang="ro" dir="ltr">
      <Head />
      <Preview>Detaliile anunțului tău și următorii pași cu RealTrust</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>RealTrust</Text>
          <Hr style={hr} />
          <Heading style={h1}>{name ? `Bună ziua, ${name}!` : 'Bună ziua!'}</Heading>
          <Text style={text}>Mulțumim pentru răspunsul pe WhatsApp. Iată detaliile anunțului despre care am discutat:</Text>
          <Section style={card}>
            <Text style={cardTitle}>{title || 'Proprietatea dvs.'}</Text>
            {zone ? <Text style={row}>Zona: {zone}, Timișoara</Text> : null}
            {price ? <Text style={row}>Preț: {price}</Text> : null}
            {rooms ? <Text style={row}>Camere: {rooms}</Text> : null}
            {size ? <Text style={row}>Suprafață: {size} mp</Text> : null}
          </Section>
          <Text style={text}>
            {isSale
              ? 'Vă propunem Vânzarea Asistată: cumpărători calificați, dosare complete și o evaluare gratuită a prețului de piață.'
              : 'Vă propunem Regimul Hotelier (ApArt Hotel): administrare 100% pasivă, randament net estimat ~9,4%/an, cu administrarea RealTrust de 15-20%.'}
          </Text>
          {url ? <Button style={button} href={url}>Vezi detaliile anunțului</Button> : null}
          <Text style={footer}>Andrei · RealTrust Timișoara · info@realtrust.ro</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OwnerListingDetails,
  subject: (d: Record<string, any>) => `Detaliile anunțului${d?.title ? `: ${d.title}` : ''} — RealTrust`,
  displayName: 'Detalii anunț proprietar (după WhatsApp)',
  previewData: { name: 'Maria', title: 'Apartament 2 camere', zone: 'Cetate', price: '99500 EUR', rooms: 2, size: 55, category: 'vanzare', url: 'https://realtrust.ro' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const logo = { fontSize: '22px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }
const hr = { borderColor: '#D4AF37', margin: '12px 0 20px' }
const h1 = { fontSize: '20px', color: '#111827' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151' }
const card = { backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px', margin: '16px 0' }
const cardTitle = { fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 8px' }
const row = { fontSize: '14px', color: '#374151', margin: '2px 0' }
const button = { backgroundColor: '#1e3a8a', color: '#ffffff', padding: '12px 22px', borderRadius: '6px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 16px' }
const footer = { fontSize: '12px', color: '#6b7280', marginTop: '24px' }
