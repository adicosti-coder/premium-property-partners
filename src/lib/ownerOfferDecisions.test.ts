import {describe,it,expect} from 'vitest';
import {canAcceptOwnerOffer} from './ownerOfferDecisions';
describe('owner offer decision rules',()=>{
 it('allows acceptance of a received offer at the saved minimum',()=>expect(canAcceptOwnerOffer('primita',120000,120000)).toBe(true));
 it('rejects acceptance below the saved minimum',()=>expect(canAcceptOwnerOffer('primita',119999,120000)).toBe(false));
 it('does not accept withdrawn offers',()=>expect(canAcceptOwnerOffer('retrasa',120000,null)).toBe(false));
});
