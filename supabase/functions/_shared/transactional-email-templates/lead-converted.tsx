import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'RealTrust'

interface LeadConvertedProps {
  title?: string
  originalPrice?: string
  extraProfit3y?: string
  monthlyExtra?: string
  leadScore?: number
  url?: string
}

const LeadConvertedEmail = ({ title, originalPrice, extraProfit3y, monthlyExtra, leadScore, url }: LeadConvertedProps) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Lead convertit: {title || 'Oportunitate nouă'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={logo}>RealTrust</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>🎉 Lead Convertit!</Heading>
        <Text style={text}>
          Un lead din sistemul de scraping a fost marcat ca <strong>convertit</strong>:
        </Text>

        <Section style={cardStyle}>
          <Heading style={cardTitle}>{title || 'Proprietate'}</Heading>
          <Section>
            <Row>
              <Column style={labelCol}>Preț original:</Column>
              <Column style={valueCol}>{originalPrice || 'N/A'}</Column>
            </Row>
            <Row>
              <Column style={labelCol}>Profit extra 3 ani:</Column>
              <Column style={valueColGreen}>+{extraProfit3y || 'N/A'}</Column>
            </Row>
            <Row>
              <Column style={labelCol}>Extra lunar:</Column>
              <Column style={valueCol}>+{monthlyExtra || 'N/A'}/lună</Column>
            </Row>
            <Row>
              <Column style={labelCol}>Scor:</Column>
              <Column style={valueCol}>{leadScore !== undefined ? `${leadScore > 80 ? '🔥 ' : ''}${leadScore}` : 'N/A'}</Column>
            </Row>
          </Section>
        </Section>

        {url && (
          <Text style={linkText}>
            Anunț original: {url}
          </Text>
        )}

        <Hr style={divider} />
        <Text style={footer}>
          Generat automat de {SITE_NAME} AI Scraper
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LeadConvertedEmail,
  subject: (data: Record<string, any>) => `🎉 Lead convertit: ${data?.title || 'Oportunitate'}`,
  displayName: 'Lead converted notification',
  previewData: {
    title: 'Apartament 2 camere Giroc',
    originalPrice: '85.000 €',
    extraProfit3y: '15.200 €',
    monthlyExtra: '420 €',
    leadScore: 92,
    url: 'https://example.com/listing/123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'NotoSans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '580px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, padding: '20px 0 10px' }
const logo = { fontSize: '28px', fontWeight: 'bold' as const, color: '#8B6914', margin: '0', fontFamily: "'Playfair Display', Georgia, serif" }
const divider = { borderColor: '#E8DFC7', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const cardStyle = { backgroundColor: '#f9f7f2', borderRadius: '12px', padding: '20px', margin: '16px 0', border: '1px solid #E8DFC7' }
const cardTitle = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1a1f36', margin: '0 0 16px', fontFamily: "'Playfair Display', Georgia, serif" }
const labelCol = { fontSize: '14px', color: '#777', padding: '4px 0', width: '50%' }
const valueCol = { fontSize: '14px', color: '#1a1f36', fontWeight: 'bold' as const, padding: '4px 0', width: '50%', textAlign: 'right' as const }
const valueColGreen = { ...valueCol, color: '#16a34a' }
const linkText = { fontSize: '13px', color: '#8B6914', margin: '8px 0 0', wordBreak: 'break-all' as const }
const footer = { fontSize: '13px', color: '#999999', margin: '20px 0 0', textAlign: 'center' as const }
