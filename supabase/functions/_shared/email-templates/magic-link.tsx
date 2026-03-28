/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Link-ul tău de autentificare pentru {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>RealTrust</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Autentificare rapidă</Heading>
        <Text style={text}>
          Apasă butonul de mai jos pentru a te autentifica pe {siteName}. Acest link va expira în curând.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={confirmationUrl}>
            Autentifică-te
          </Button>
        </Section>
        <Hr style={divider} />
        <Text style={footer}>
          Dacă nu ai solicitat acest link, poți ignora acest email în siguranță.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
