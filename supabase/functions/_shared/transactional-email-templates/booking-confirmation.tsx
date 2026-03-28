import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface BookingConfirmationProps {
  guestName?: string
  propertyName?: string
  checkIn?: string
  checkOut?: string
  guests?: number
}

const BookingConfirmationEmail = ({
  guestName,
  propertyName,
  checkIn,
  checkOut,
  guests,
}: BookingConfirmationProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Rezervarea ta la {propertyName || 'RealTrust'} a fost confirmată!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {guestName ? `Mulțumim, ${guestName}!` : 'Rezervarea ta a fost confirmată!'} 🏨
        </Heading>
        <Text style={text}>
          Suntem bucuroși să te informăm că rezervarea ta a fost confirmată cu succes.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailLabel}>🏠 Proprietate</Text>
          <Text style={detailValue}>{propertyName || 'Apartament RealTrust'}</Text>
          
          <Text style={detailLabel}>📅 Check-in</Text>
          <Text style={detailValue}>{checkIn || 'A se confirma'}</Text>
          
          <Text style={detailLabel}>📅 Check-out</Text>
          <Text style={detailValue}>{checkOut || 'A se confirma'}</Text>
          
          {guests && (
            <>
              <Text style={detailLabel}>👥 Oaspeți</Text>
              <Text style={detailValue}>{guests} {guests === 1 ? 'persoană' : 'persoane'}</Text>
            </>
          )}
        </Section>

        <Text style={text}>
          Vei primi un ghid digital complet al proprietății cu instrucțiuni de acces, 
          WiFi, parcare și recomandări locale înainte de check-in.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href="https://www.realtrust.ro/oaspeti">
            Vezi Proprietățile Noastre
          </Button>
        </Section>

        <Text style={contactText}>
          Ai întrebări? Contactează-ne pe WhatsApp sau la info@realtrust.ro
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
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Rezervare confirmată${data.propertyName ? ` — ${data.propertyName}` : ''} ✅`,
  displayName: 'Booking confirmation',
  previewData: {
    guestName: 'Maria',
    propertyName: 'Green Forest Apart Hotel',
    checkIn: '15 Iunie 2026',
    checkOut: '18 Iunie 2026',
    guests: 2,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#FAF7F0', borderRadius: '8px', padding: '20px', margin: '20px 0', border: '1px solid #E8DFC7' }
const detailLabel = { fontSize: '12px', color: '#8B6914', fontWeight: 'bold' as const, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const detailValue = { fontSize: '15px', color: '#1a1f36', margin: '0 0 14px', fontWeight: '500' as const }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#8B6914', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none' }
const contactText = { fontSize: '13px', color: '#8B6914', textAlign: 'center' as const, margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
