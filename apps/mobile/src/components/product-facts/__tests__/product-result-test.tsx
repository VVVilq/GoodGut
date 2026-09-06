import TestRenderer, { act } from 'react-test-renderer';
import { NormalizedProduct, ProductLookup } from '@/domain/product-lookup/types';
import { PersonalProfile } from '@/domain/personal-profile';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';
import { ProductLookupState } from '@/features/product-lookup/lookup-state-machine';
import { presentProductLookup } from '@/features/product-lookup/presentation';
import { ProductResult } from '../product-result';

jest.mock('@/constants/theme', () => ({ Spacing: { one: 4, two: 8, three: 12, four: 16, five: 24 } }));
jest.mock('@/components/themed-text', () => ({ ThemedText: 'Text' }));
jest.mock('@/components/themed-view', () => ({ ThemedView: 'View' }));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => ({ warning: '#B42318', warningBackground: '#FFF0EE', backgroundSelected: '#E3F2E8', textSecondary: '#60736C', ingredientUnrecognized: '#8A6D1D' }) }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));


const product: NormalizedProduct = {
  identity: { displayName: 'Example', brands: [], quantity: null, imageUrl: null },
  nutriScore: { status: 'missing' },
  ingredients: { status: 'missing' },
  nutrition: {
    energy_kcal: { status: 'available', value: 42, unit: 'kcal', basis: 'per_100ml' },
    carbohydrates: { status: 'available', value: 10, unit: 'g', basis: 'per_100ml' },
    sugars: { status: 'available', value: 12, unit: 'g', basis: 'per_100ml' },
    fat: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
    saturated_fat: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
    fiber: { status: 'unavailable', reason: 'missing_source' },
    protein: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
    salt: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
  },
};

const profile: PersonalProfile = {
  selections: [],
  customIngredients: [],
  nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 10, basis: 'per_100ml' }],
};

function renderProduct(barcode = '12345678') {
  const result: ProductLookup = {
    contractVersion: '3.0',
    outcome: 'found',
    barcode,
    source: { provider: 'open_food_facts', providerProductUrl: null, fetchedAt: '2026-08-19T00:00:00Z' },
    product,
  };
  const lookup: ProductLookupState = { status: 'resolved', barcode, result };
  const state: PersonalProfileState = { status: 'ready', activeProfile: profile };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<ProductResult presentation={presentProductLookup(lookup, state)} onAction={jest.fn()} />); });
  return renderer;
}

function textContent(node: TestRenderer.ReactTestInstance) {
  return node.findAll((child) => String(child.type) === 'Text').map((child) => child.children.join('')).join(' ');
}

describe('ProductResult interactions', () => {
  it('expands and collapses a triggered nutrition threshold while ordinary rows stay noninteractive', () => {
    const renderer = renderProduct();
    const warningButton = renderer.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityState?.expanded === false)
      .find((node) => textContent(node).includes('Cukry'));
    expect(warningButton).toBeDefined();
    expect(renderer.root.findAll((node) => String(node.type) === 'Text' && textContent(node).includes('Twój próg'))).toHaveLength(0);
    expect(renderer.root.findAll((node) => node.props.accessibilityRole === 'button' && textContent(node).includes('Energia'))).toHaveLength(0);

    act(() => warningButton!.props.onPress());
    expect(warningButton!.props.accessibilityState).toEqual({ expanded: true });
    expect(renderer.root.findAll((node) => String(node.type) === 'Text' && textContent(node).includes('Twój próg'))).toHaveLength(1);

    act(() => warningButton!.props.onPress());
    expect(warningButton!.props.accessibilityState).toEqual({ expanded: false });
  });

  it('resets expanded disclosure when the evaluated product identity changes', () => {
    const renderer = renderProduct('12345678');
    const warningButton = renderer.root.findAll((node) => node.props.accessibilityRole === 'button' && textContent(node).includes('Cukry'))[0];
    act(() => warningButton.props.onPress());
    expect(warningButton.props.accessibilityState).toEqual({ expanded: true });

    act(() => renderer.update(<ProductResult presentation={presentProductLookup({
      status: 'resolved', barcode: '87654321', result: {
        contractVersion: '3.0', outcome: 'found', barcode: '87654321',
        source: { provider: 'open_food_facts', providerProductUrl: null, fetchedAt: '2026-08-19T00:00:00Z' }, product,
      },
    }, { status: 'ready', activeProfile: profile })} onAction={jest.fn()} />));
    const nextWarningButton = renderer.root.findAll((node) => node.props.accessibilityRole === 'button' && textContent(node).includes('Cukry'))[0];
    expect(nextWarningButton.props.accessibilityState).toEqual({ expanded: false });
  });

  it('resets disclosure when a saved threshold changes but the warning title remains the same', () => {
    const renderer = renderProduct();
    const warningButton = renderer.root.findAll((node) => node.props.accessibilityRole === 'button' && textContent(node).includes('Cukry'))[0];
    act(() => warningButton.props.onPress());
    const changedProfile = { ...profile, nutritionThresholds: [{ ...profile.nutritionThresholds[0], threshold: 9 }] };
    act(() => renderer.update(<ProductResult presentation={presentProductLookup({ status: 'resolved', barcode: '12345678', result: { contractVersion: '3.0', outcome: 'found', barcode: '12345678', source: { provider: 'open_food_facts', providerProductUrl: null, fetchedAt: '2026-08-19T00:00:00Z' }, product } }, { status: 'ready', activeProfile: changedProfile })} onAction={jest.fn()} />));
    const nextWarningButton = renderer.root.findAll((node) => node.props.accessibilityRole === 'button' && textContent(node).includes('Cukry'))[0];
    expect(nextWarningButton.props.accessibilityState).toEqual({ expanded: false });
  });
});
