import { describe, it, expect } from 'vitest';
import { formatGstState, GST_STATE_MAP, GST_CODE_TO_STATE } from '../src/utils/gstStateCodes';

describe('GST State Codes Utility', () => {
  it('should map standard state names to correct GST codes', () => {
    expect(formatGstState('Kerala')).toBe('32-Kerala');
    expect(formatGstState('Tamil Nadu')).toBe('33-Tamil Nadu');
    expect(formatGstState('tamilnadu')).toBe('33-Tamil Nadu');
    expect(formatGstState('Karnataka')).toBe('29-Karnataka');
    expect(formatGstState('Maharashtra')).toBe('27-Maharashtra');
    expect(formatGstState('Delhi')).toBe('07-Delhi');
    expect(formatGstState('Telangana')).toBe('36-Telangana');
    expect(formatGstState('Andhra Pradesh')).toBe('37-Andhra Pradesh');
    expect(formatGstState('Gujarat')).toBe('24-Gujarat');
  });

  it('should not duplicate prefixes if already formatted', () => {
    expect(formatGstState('32-Kerala')).toBe('32-Kerala');
    expect(formatGstState('33-Tamil Nadu')).toBe('33-Tamil Nadu');
    expect(formatGstState('29 - Karnataka')).toBe('29-Karnataka');
  });

  it('should extract state code from GSTIN when state name is missing', () => {
    expect(formatGstState('', '33AALFL1802A1Z3')).toBe('33-Tamil Nadu');
    expect(formatGstState(null, '29AAAAA0000A1Z5')).toBe('29-Karnataka');
    expect(formatGstState(undefined, '32AALFL1802A1Z3')).toBe('32-Kerala');
  });

  it('should fallback to 32-Kerala when nothing is provided', () => {
    expect(formatGstState()).toBe('32-Kerala');
    expect(formatGstState('')).toBe('32-Kerala');
    expect(formatGstState(null, null)).toBe('32-Kerala');
  });
});
