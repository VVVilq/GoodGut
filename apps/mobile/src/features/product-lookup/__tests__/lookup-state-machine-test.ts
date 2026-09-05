import { GoodGutClientError } from '@/data/goodgut-api';
import { ProductLookup } from '@/domain/product-lookup/types';
import { ProductLookupStateMachine } from '../lookup-state-machine';

const notFound = (barcode: string): ProductLookup => ({
  contractVersion: '3.0',
  outcome: 'not_found',
  barcode,
  source: { provider: 'open_food_facts' },
  reason: 'not_in_source',
});

const sourceError = (barcode: string): ProductLookup => ({
  contractVersion: '3.0',
  outcome: 'source_error',
  barcode,
  source: { provider: 'open_food_facts' },
  errorCategory: 'source_unavailable',
});

describe('ProductLookupStateMachine', () => {
  it('locks duplicate capture while one request is active', async () => {
    const pending = deferred<ProductLookup>();
    const request = jest.fn(() => pending.promise);
    const machine = new ProductLookupStateMachine(request);

    const first = machine.capture('12345678');
    await expect(machine.capture('12345678')).resolves.toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    pending.resolve(notFound('12345678'));
    await first;
    expect(machine.getState()).toMatchObject({ status: 'resolved', barcode: '12345678' });
  });

  it('validates manual input before lookup', async () => {
    const request = jest.fn();
    const machine = new ProductLookupStateMachine(request);

    await expect(machine.submit('1234abcd')).resolves.toBe(false);
    expect(machine.getState()).toEqual({ status: 'validation_error', input: '1234abcd' });
    expect(request).not.toHaveBeenCalled();
  });

  it('retries only explicitly and with the same barcode', async () => {
    const request = jest
      .fn<Promise<ProductLookup>, [string, AbortSignal?]>()
      .mockResolvedValueOnce(sourceError('12345678'))
      .mockResolvedValueOnce(notFound('12345678'));
    const machine = new ProductLookupStateMachine(request);

    await machine.submit('12345678');
    expect(request).toHaveBeenCalledTimes(1);
    await machine.retry();
    expect(request.mock.calls[1][0]).toBe('12345678');
  });

  it('maps client failures and retries only after user action', async () => {
    const request = jest
      .fn<Promise<ProductLookup>, [string, AbortSignal?]>()
      .mockRejectedValueOnce(new GoodGutClientError('transport_failure', 'offline'))
      .mockResolvedValueOnce(notFound('12345678'));
    const machine = new ProductLookupStateMachine(request);

    await machine.submit('12345678');
    expect(machine.getState()).toMatchObject({
      status: 'client_error',
      error: { kind: 'transport_failure' },
    });
    expect(request).toHaveBeenCalledTimes(1);
    await machine.retry();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('ignores stale completion after rescan and accepts a new lookup', async () => {
    const first = deferred<ProductLookup>();
    const second = deferred<ProductLookup>();
    const request = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const machine = new ProductLookupStateMachine(request);

    const oldLookup = machine.submit('12345678');
    const firstSignal = request.mock.calls[0][1] as AbortSignal;
    machine.rescan();
    expect(firstSignal.aborted).toBe(true);
    const newLookup = machine.capture('87654321');
    first.resolve(notFound('12345678'));
    await oldLookup;
    expect(machine.getState()).toMatchObject({ status: 'loading', barcode: '87654321' });
    second.resolve(notFound('87654321'));
    await newLookup;
    expect(machine.getState()).toMatchObject({ status: 'resolved', barcode: '87654321' });
  });

  it('rescan clears terminal state and re-enables capture', async () => {
    const request = jest.fn(async (barcode: string) => notFound(barcode));
    const machine = new ProductLookupStateMachine(request);
    await machine.submit('12345678');

    machine.rescan();

    expect(machine.getState()).toEqual({ status: 'idle' });
    await expect(machine.capture('87654321')).resolves.toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
