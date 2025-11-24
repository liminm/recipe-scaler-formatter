import React from 'react';

interface AggregatedIngredient {
  name: string;
  quantity: number;
  role: string;
  baseQuantity: number;
}

interface ShoppingListProps {
  ingredients: AggregatedIngredient[];
}

export default function ShoppingList({ ingredients }: ShoppingListProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(ingredients, null, 2));
    alert('Shopping list copied to clipboard!');
  };

  const handleExportCSV = () => {
    const headers = ['Ingredient', 'Quantity (g)', 'Role'];
    const rows = ingredients.map(ing => [
      ing.name,
      Math.round(ing.quantity).toString(),
      ing.role
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'shopping_list.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="event-panel shopping-panel">
      <div className="ingest-section-head">
        <div>
          <p className="eyebrow">Shopping list</p>
          <h3>Combined ingredients</h3>
        </div>
        <div className="pill">{ingredients.length} lines</div>
      </div>
      <div className="ingredient-list">
        {ingredients.length === 0 && <p className="text-muted">Add recipes to build a list.</p>}
        {ingredients.map((ing) => (
          <div key={ing.name + ing.role} className="ingredient-row">
            <div>
              <div style={{ fontWeight: 600 }}>{ing.name}</div>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Role: {ing.role}
              </p>
            </div>
            <div className="ingredient-controls">
              <span className="stat-value" style={{ fontSize: '1rem' }}>
                {Math.round(ing.quantity)} g
              </span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-secondary w-full" onClick={handleCopy}>
          Copy list
        </button>
        <button className="btn btn-primary w-full" onClick={handleExportCSV}>
          Export CSV
        </button>
      </div>
    </div>
  );
}
