import { describe,it,expect } from 'vitest';
import { campaignTarget } from './socialGrowth';
import { appendSocialFollow } from '../../supabase/functions/_shared/socialFollow';
describe('social campaign safety',()=>{
 it('keeps owner guide internal with explicit social attribution',()=>{const url=new URL(campaignTarget('owners_guide','instagram','ghid_test') ?? 'https://invalid.test');expect(url.origin).toBe('https://realtrust.ro');expect(url.hash).toBe('#ghid-proprietar');expect(url.searchParams.get('utm_source')).toBe('instagram');expect(url.searchParams.get('utm_medium')).toBe('social');});
 it('rejects unapproved redirect targets',()=>{expect(campaignTarget('https://evil.test','facebook','test')).toBeNull();expect(campaignTarget('__proto__','facebook','test')).toBeNull();});
 it('rejects invalid campaign data',()=>{expect(campaignTarget('calculator','unknown','test')).toBeNull();expect(campaignTarget('calculator','facebook','bad campaign')).toBeNull();});
});
describe('single WhatsApp confirmation',()=>{
 it('adds one PS, not a second confirmation',()=>{const once=appendSocialFollow('Am primit cererea.');expect(once.split('P.S.').length).toBe(2);expect(appendSocialFollow(once)).toBe(once);});
 it('preserves opt-out last',()=>{const message=appendSocialFollow('Confirmare. Dacă nu doriți mesaje, răspundeți NU.');expect(message.endsWith('Dacă nu doriți mesaje, răspundeți NU.')).toBe(true);});
 it('never changes consent or STOP messages',()=>{for(const msg of ['STOP','Am retras acordul de publicare.','Nu vă vom mai contacta.'])expect(appendSocialFollow(msg)).toBe(msg);});
 it('rejects unrelated social profiles',()=>{expect(appendSocialFollow('Confirmare',{instagram:'https://evil.test',facebook:'javascript:alert(1)'})).toBe('Confirmare');});
});
