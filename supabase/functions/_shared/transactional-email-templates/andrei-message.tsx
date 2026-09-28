import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Hr, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; message?: string }

const AndreiMessage = ({ name, message }: Props) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Mesaj de la Andrei — RealTrust Timișoara</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>RealTrust Timișoara</Text>
        <Hr style={hr} />
        <Text style={text}>{name ? `Bună ziua, ${name},` : 'Bună ziua,'}</Text>
        {(message || '').split('\n').map((l, i) => <Text key={i} style={text}>{l}</Text>)}
        <Text style={sign}>Andrei · RealTrust · info@realtrust.ro</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AndreiMessage,
  subject: 'Mesaj de la Andrei — RealTrust',
  displayName: 'Mesaj Andrei către lead',
  previewData: { name: 'Maria', message: 'Vă mulțumesc pentru interes. Când vă pot suna 2 minute?' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const logo = { fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }
const hr = { borderColor: '#D4AF37', margin: '12px 0 20px' }
const text = { fontSize: '15px', lineHeight: '22px', color: '#374151', margin: '6px 0' }
const sign = { fontSize: '14px', color: '#6b7280', marginTop: '20px' }
