import { Decimal } from './decimal';
import { UNIT_CONVERSIONS } from './constants';

export type UnitType = 'mass' | 'volume' | 'unknown';

export function getUnitType(unit: string): UnitType {
    const normalized = unit.toLowerCase().replace(/s$/, ''); // simple plural removal
    const entry = UNIT_CONVERSIONS[normalized];
    return entry ? entry.type : 'unknown';
}

export function convertToBaseUnit(quantity: Decimal, unit: string): { quantity: Decimal, unit: 'g' | 'ml' } | null {
    const normalized = unit.toLowerCase().replace(/s$/, '');
    const entry = UNIT_CONVERSIONS[normalized];

    if (!entry) return null;

    const baseQuantity = quantity.times(entry.factor);
    const baseUnit = entry.type === 'mass' ? 'g' : 'ml';

    return { quantity: baseQuantity, unit: baseUnit };
}

export function fahrenheitToCelsius(f: Decimal): Decimal {
    return f.minus(32).times(5).dividedBy(9);
}

// Helper to convert volume to mass if density is known
export function volumeToMass(volumeMl: Decimal, density: Decimal): Decimal {
    return volumeMl.times(density);
}
