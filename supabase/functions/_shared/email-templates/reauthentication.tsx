/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Codul tău de verificare</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Heading style={logo}>RealTrust</Heading>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Confirmă identitatea</Heading>
        <Text style={text}>Folosește codul de mai jos pentru a-ți confirma identitatea:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={divider} />
        <Text style={footer}>
          Acest cod va expira în curând. Dacă nu ai solicitat acest cod, poți ignora acest email în siguranță.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0 0 30px', textAlign: 'center' as const, letterSpacing: '4px' }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
