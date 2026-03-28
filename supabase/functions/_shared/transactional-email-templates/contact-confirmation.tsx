import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface ContactConfirmationProps {
  name?: string
}

const ContactConfirmationEmail = ({ name }: ContactConfirmationProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Am primit mesajul tău — echipa {SITE_NAME} îți va răspunde în curând!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Mulțumim, ${name}!` : 'Mulțumim pentru mesaj!'} 📩
        </Heading>
        <Text style={text}>
          Am primit mesajul tău și un membru al echipei noastre te va contacta în cel mai scurt timp posibil, 
          de obicei în maxim 24 de ore lucrătoare.
        </Text>
        <Text style={text}>
          Între timp, poți explora proprietățile noastre sau calcula potențialul de venit din închiriere.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://www.realtrust.ro/pentru-proprietari">
            Calculează Venitul Potențial
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
  component: ContactConfirmationEmail,
  subject: 'Am primit mesajul tău — te contactăm în curând!',
  displayName: 'Contact form confirmation',
  previewData: { name: 'Ion' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#8B6914', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
