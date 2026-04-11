import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface ListingSubmittedProps {
  name?: string
  listingTitle?: string
  category?: string
}

const categoryLabels: Record<string, string> = {
  vanzare: 'Vânzare',
  inchiriere: 'Închiriere',
  regim_hotelier: 'Regim Hotelier',
}

const ListingSubmittedEmail = ({ name, listingTitle, category }: ListingSubmittedProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Anunțul tău a fost trimis cu succes — un consultant {SITE_NAME} te va contacta în maxim 24h!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Felicitări, ${name}!` : 'Felicitări!'} 🎉
        </Heading>
        <Text style={text}>
          Anunțul tău{listingTitle ? ` „${listingTitle}"` : ''}{category ? ` (${categoryLabels[category] || category})` : ''} a fost trimis cu succes și este în curs de procesare.
        </Text>
        <Section style={highlightBox}>
          <Text style={highlightText}>
            📞 Un consultant {SITE_NAME} te va contacta telefonic în maximum <strong>24 de ore</strong> pentru a programa inspecția la fața locului.
          </Text>
        </Section>
        <Text style={text}>
          După finalizarea inspecției, anunțul tău va fi publicat pe platforma noastră și va deveni vizibil pentru toți utilizatorii.
        </Text>
        <Text style={text}>
          Între timp, poți vedea statusul anunțului tău accesând profilul tău de pe platformă.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://www.realtrust.ro/profil">
            Vezi Profilul Meu
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Cu stimă, Echipa {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ListingSubmittedEmail,
  subject: 'Anunțul tău a fost trimis — te contactăm în 24h!',
  displayName: 'Listing submitted confirmation',
  previewData: { name: 'Maria', listingTitle: 'Apartament 2 camere Centru', category: 'regim_hotelier' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const highlightBox = { backgroundColor: '#FFF9ED', border: '1px solid #E8DFC7', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const highlightText = { fontSize: '15px', color: '#1a1f36', lineHeight: '1.6', margin: '0' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#8B6914', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
