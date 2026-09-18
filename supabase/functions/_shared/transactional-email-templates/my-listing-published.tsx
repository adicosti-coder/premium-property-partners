import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface MyListingPublishedProps {
  listingTitle?: string
  platform?: string
  platformUrl?: string
  price?: string
  zone?: string
  publishedAt?: string
}

const MyListingPublishedEmail = ({
  listingTitle, platform, platformUrl, price, zone, publishedAt,
}: MyListingPublishedProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>
      {`Anunț publicat pe ${platform || 'platformă'}${listingTitle ? `: ${listingTitle}` : ''}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Anunț publicat pe {platform || 'platformă'}</Heading>
        <Text style={text}>
          Anunțul{listingTitle ? ` „${listingTitle}"` : ''} a fost marcat ca publicat
          {platform ? ` pe ${platform}` : ''}
          {publishedAt ? `, la ${publishedAt}` : ''}.
        </Text>
        <Section style={highlightBox}>
          <Text style={highlightText}>
            <strong>Platformă:</strong> {platform || '—'}<br />
            <strong>Zonă:</strong> {zone || '—'}<br />
            <strong>Preț:</strong> {price || '—'}
          </Text>
        </Section>
        {platformUrl ? (
          <>
            <Section style={buttonContainer}>
              <Button style={button} href={platformUrl}>Vezi anunțul publicat</Button>
            </Section>
            <Text style={smallText}>
              Link: <Link href={platformUrl} style={link}>{platformUrl}</Link>
            </Text>
          </>
        ) : (
          <Text style={smallText}>
            Adaugă linkul anunțului în Admin pentru a-l avea direct în acest e-mail.
          </Text>
        )}
        <Hr style={divider} />
        <Text style={footer}>Echipa {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MyListingPublishedEmail,
  subject: (data: Record<string, any>) =>
    `Anunț publicat pe ${data?.platform || 'platformă'}${data?.listingTitle ? ` — ${data.listingTitle}` : ''}`,
  displayName: 'Anunț publicat pe platformă',
  previewData: {
    listingTitle: 'Apartament 2 camere, Cetate',
    platform: 'OLX',
    platformUrl: 'https://www.olx.ro/d/oferta/exemplu',
    price: '82.000 €',
    zone: 'Cetate',
    publishedAt: '18.09.2026, 17:30',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '13px', color: '#777777', lineHeight: '1.5', margin: '0 0 12px', wordBreak: 'break-all' as const }
const link = { color: '#8B6914' }
const highlightBox = { backgroundColor: '#FFF9ED', border: '1px solid #E8DFC7', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const highlightText = { fontSize: '15px', color: '#1a1f36', lineHeight: '1.8', margin: '0' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#8B6914', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
