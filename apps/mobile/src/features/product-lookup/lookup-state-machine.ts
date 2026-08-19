import { GoodGutClientError } from '@/data/goodgut-api';
import { ProductLookup } from '@/domain/product-lookup/types';

export type LookupClientError = {
  kind: 'missing_configuration' | 'transport_failure' | 'http_error' | 'invalid_response' | 'unexpected';
  status?: number;
};

export type ProductLookupState =
  | { status: 'idle' }
  | { status: 'validation_error'; input: string }
  | { status: 'loading'; barcode: string }
  | { status: 'resolved'; barcode: string; result: ProductLookup }
  | { status: 'client_error'; barcode: string; error: LookupClientError };

export type ProductLookupRequest = (barcode: string) => Promise<ProductLookup>;

export class ProductLookupStateMachine {
  private state: ProductLookupState = { status: 'idle' };
  private generation = 0;
  private listeners = new Set<() => void>();

  constructor(private readonly request: ProductLookupRequest) {}

  getState = (): ProductLookupState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async submit(input: string): Promise<boolean> {
    if (this.state.status === 'loading') return false;
    if (!isValidBarcode(input)) {
      this.setState({ status: 'validation_error', input });
      return false;
    }
    return this.start(input);
  }

  async capture(barcode: string): Promise<boolean> {
    if (this.state.status !== 'idle' || !isValidBarcode(barcode)) return false;
    return this.start(barcode);
  }

  async retry(): Promise<boolean> {
    if (this.state.status !== 'client_error' && this.state.status !== 'resolved') return false;
    if (this.state.status === 'resolved' && this.state.result.outcome !== 'source_error') return false;
    return this.start(this.state.barcode);
  }

  rescan(): void {
    this.generation += 1;
    this.setState({ status: 'idle' });
  }

  private async start(barcode: string): Promise<boolean> {
    const requestGeneration = ++this.generation;
    this.setState({ status: 'loading', barcode });
    try {
      const result = await this.request(barcode);
      if (requestGeneration === this.generation) {
        this.setState({ status: 'resolved', barcode, result });
      }
    } catch (error) {
      if (requestGeneration === this.generation) {
        this.setState({ status: 'client_error', barcode, error: clientError(error) });
      }
    }
    return true;
  }

  private setState(state: ProductLookupState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

export function isValidBarcode(value: string): boolean {
  return /^[0-9]{8,14}$/.test(value);
}

function clientError(error: unknown): LookupClientError {
  if (error instanceof GoodGutClientError) {
    return { kind: error.kind, status: error.status };
  }
  return { kind: 'unexpected' };
}
