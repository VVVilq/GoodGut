import { isValidBarcode } from './lookup-state-machine';

export const supportedBarcodeTypes = ['ean13', 'ean8', 'upc_a', 'upc_e', 'itf14'] as const;
export type SupportedBarcodeType = (typeof supportedBarcodeTypes)[number];

export type CameraPermissionView = 'loading' | 'request' | 'denied' | 'granted';

export function cameraPermissionView(
  permission: { granted: boolean; canAskAgain: boolean } | null,
): CameraPermissionView {
  if (permission === null) return 'loading';
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'request' : 'denied';
}

export class ScanCapturePolicy {
  private locked = false;

  accept(type: string, data: string): boolean {
    if (
      this.locked ||
      !supportedBarcodeTypes.includes(type as SupportedBarcodeType) ||
      !isValidBarcode(data)
    ) {
      return false;
    }
    this.locked = true;
    return true;
  }

  reset() {
    this.locked = false;
  }
}
