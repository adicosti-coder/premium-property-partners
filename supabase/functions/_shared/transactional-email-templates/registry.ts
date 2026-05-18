/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeEmail } from './welcome.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as leadConverted } from './lead-converted.tsx'
import { template as listingSubmitted } from './listing-submitted.tsx'
import { template as adminOtp } from './admin-otp.tsx'
import { template as systemHealthReport } from './system-health-report.tsx'
import { template as e2eRecovery } from './e2e-recovery.tsx'
import { template as automationDailyDigest } from './automation-daily-digest.tsx'
import { template as automationRunReport } from './automation-run-report.tsx'
import { template as seoWeeklyReport } from './seo-weekly-report.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcomeEmail,
  'booking-confirmation': bookingConfirmation,
  'contact-confirmation': contactConfirmation,
  'lead-converted': leadConverted,
  'listing-submitted': listingSubmitted,
  'admin-otp': adminOtp,
  'system-health-report': systemHealthReport,
  'e2e-recovery': e2eRecovery,
  'automation-daily-digest': automationDailyDigest,
  'automation-run-report': automationRunReport,
  'seo-weekly-report': seoWeeklyReport,
}
