interface Ingredient {
  name: string;
  quantity: number;
  role: string;
  isHighPotency: boolean;
}

export default function ScaledIngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <div className="card">
      <h3 className="mb-4">Scaled Ingredient List</h3>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600 }}>
              Ingredient
            </th>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600 }}>
              Quantity
            </th>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600 }}>
              Role
            </th>
            <th className="text-muted" style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
              Flags
            </th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ing, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem' }}>{ing.name}</td>
              <td className="text-mono" style={{ padding: '0.75rem', textAlign: 'right' }}>
                {ing.quantity >= 1000 ? `${(ing.quantity / 1000).toFixed(2)} kg` : `${ing.quantity} g`}
              </td>
              <td className="text-muted" style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                {ing.role}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                {ing.isHighPotency && (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                    High Potency
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
