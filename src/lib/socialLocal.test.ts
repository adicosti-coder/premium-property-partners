import {describe,it,expect} from 'vitest';
import {localSocialRows,canonicalSocialUrl} from '../../supabase/functions/scrape-realtrust/local';
describe('local social extraction',()=>{
 it('preserves saved property title, description, zone, price and photos',()=>{const [row]=localSocialRows([{id:'p',slug:'apartament',name:'Apartament Iosefin',description_ro:'Două camere',location:'Iosefin',listing_type:'inchiriere',capital_necesar:550,image_path:'cover.jpg',images:['second.jpg']}],[],p=>'https://storage/'+p);expect(row.title).toBe('Apartament Iosefin');expect(row.caption).toContain('550 €/lună');expect(row.caption).toContain('Iosefin');expect(row.image_urls).toEqual(['https://storage/cover.jpg','https://storage/second.jpg']);expect(row.status).toBe('draft');});
 it('extracts saved article image and text without a scraper',()=>{const [row]=localSocialRows([],[{slug:'pfa',title:'PFA',excerpt:'Fiscalitate',cover_image:'https://site/photo.jpg'}],p=>p);expect(row.source_url).toBe('https://realtrust.ro/blog/pfa');expect(row.caption).toBe('Fiscalitate');expect(row.image_url).toBe('https://site/photo.jpg');});
 it('canonicalizes URLs to avoid duplicate drafts',()=>expect(canonicalSocialUrl('https://www.realtrust.ro/blog/pfa/?utm_source=x')).toBe('https://realtrust.ro/blog/pfa'));
});
