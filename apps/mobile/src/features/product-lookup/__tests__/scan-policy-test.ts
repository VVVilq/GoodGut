import { cameraPermissionView, ScanCapturePolicy, supportedBarcodeTypes } from '../scan-policy';

describe('scan policy', () => {
  it.each([
    [null, 'loading'],
    [{ granted: false, canAskAgain: true }, 'request'],
    [{ granted: false, canAskAgain: false }, 'denied'],
    [{ granted: true, canAskAgain: true }, 'granted'],
  ] as const)('maps permission state to %s', (permission, expected) => {
    expect(cameraPermissionView(permission)).toBe(expected);
  });

  it.each(supportedBarcodeTypes)('accepts supported %s product barcodes', (type) => {
    expect(new ScanCapturePolicy().accept(type, '12345678')).toBe(true);
  });

  it('rejects unsupported formats, non-digits, and invalid lengths', () => {
    const policy = new ScanCapturePolicy();
    expect(policy.accept('qr', '12345678')).toBe(false);
    expect(policy.accept('ean13', '1234abcd')).toBe(false);
    expect(policy.accept('ean13', '1234567')).toBe(false);
    expect(policy.accept('ean13', '123456789012345')).toBe(false);
  });

  it('locks after the first accepted detection and reset re-enables capture', () => {
    const policy = new ScanCapturePolicy();
    expect(policy.accept('ean13', '12345678')).toBe(true);
    expect(policy.accept('ean13', '87654321')).toBe(false);
    policy.reset();
    expect(policy.accept('ean13', '87654321')).toBe(true);
  });
});
