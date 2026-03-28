import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Bine ai venit la {SITE_NAME}! Explorează platforma noastră.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>{SITE_NAME}</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Bine ai venit, ${name}! 🎉` : 'Bine ai venit la RealTrust! 🎉'}
        </Heading>
        <Text style={text}>
          Suntem încântați să te avem alături. RealTrust este platforma ta de încredere pentru 
          administrarea profesională a proprietăților și investiții imobiliare în Timișoara.
        </Text>
        <Text style={text}>
          Iată ce poți face pe platformă:
        </Text>
        <Text style={listItem}>✅ Explorează proprietățile noastre gestionate profesional</Text>
        <Text style={listItem}>✅ Calculează potențialul de venit din închiriere</Text>
        <Text style={listItem}>✅ Accesează ghiduri și articole despre piața imobiliară</Text>
        <Text style={listItem}>✅ Primește notificări personalizate</Text>
        <Section style={buttonContainer}>
          <Button style={button} href="https://www.realtrust.ro">
            Explorează Platforma
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
  component: WelcomeEmail,
  subject: 'Bine ai venit la RealTrust! 🎉',
  displayName: 'Welcome email',
  previewData: { name: 'Alexandru' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 8px', paddingLeft: '8px' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#8B6914', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
