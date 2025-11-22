import { Decimal } from './decimal';

// Density table (g/ml)
export const STATIC_DENSITY_TABLE: Record<string, Decimal> = {
    // Water reference
    'water': new Decimal(1),

    // Salts
    'table salt': new Decimal(1.2),
    'kosher salt': new Decimal(0.8), // Rough average, varies by brand (Diamond vs Morton)
    'flaky salt': new Decimal(0.5),

    // Flours
    'all-purpose flour': new Decimal(0.53), // ~125g per cup (236ml)
    'bread flour': new Decimal(0.54),
    'cake flour': new Decimal(0.48),
    'whole wheat flour': new Decimal(0.55),

    // Sugars
    'granulated sugar': new Decimal(0.85),
    'brown sugar': new Decimal(0.93), // Packed
    'powdered sugar': new Decimal(0.48),

    // Fats
    'butter': new Decimal(0.911),
    'oil': new Decimal(0.92),
};

// Unit conversion factors to Base Units (g, ml)
export const UNIT_CONVERSIONS: Record<string, { factor: Decimal, type: 'mass' | 'volume' }> = {
    // Mass (to g)
    'oz': { factor: new Decimal(28.3495), type: 'mass' },
    'ounce': { factor: new Decimal(28.3495), type: 'mass' },
    'lb': { factor: new Decimal(453.592), type: 'mass' },
    'pound': { factor: new Decimal(453.592), type: 'mass' },
    'kg': { factor: new Decimal(1000), type: 'mass' },
    'g': { factor: new Decimal(1), type: 'mass' },

    // Volume (to ml)
    'tsp': { factor: new Decimal(4.92892), type: 'volume' },
    'teaspoon': { factor: new Decimal(4.92892), type: 'volume' },
    'tbsp': { factor: new Decimal(14.7868), type: 'volume' },
    'tablespoon': { factor: new Decimal(14.7868), type: 'volume' },
    'cup': { factor: new Decimal(236.588), type: 'volume' },
    'fl oz': { factor: new Decimal(29.5735), type: 'volume' },
    'pint': { factor: new Decimal(473.176), type: 'volume' },
    'quart': { factor: new Decimal(946.353), type: 'volume' },
    'gallon': { factor: new Decimal(3785.41), type: 'volume' },
    'l': { factor: new Decimal(1000), type: 'volume' },
    'liter': { factor: new Decimal(1000), type: 'volume' },
    'ml': { factor: new Decimal(1), type: 'volume' },
};
