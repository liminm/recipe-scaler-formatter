interface MenuRecipe {
  recipeId: string;
  instanceId?: string; // Added for unique identification
  title: string;
  role: 'Main' | 'Side' | 'Filler' | 'Dessert';
  targetPercentage: number;
  scaledMass: number;
  scaleFactor: number;
}

interface MenuBuilderProps {
  menuRecipes: MenuRecipe[];
  onRemoveRecipe: (id: string) => void;
  onUpdateRole: (id: string, role: MenuRecipe['role']) => void;
  onUpdatePercentage: (id: string, percentage: number) => void;
}

export default function MenuBuilder({ 
  menuRecipes, 
  onRemoveRecipe,
  onUpdateRole,
  onUpdatePercentage 
}: MenuBuilderProps) {
  const totalPercentage = menuRecipes.reduce((sum, r) => sum + r.targetPercentage, 0);
  const totalMass = menuRecipes.reduce((sum, r) => sum + r.scaledMass, 0);
  
  return (
    <div className="card" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Current Menu</h3>
        <span className="text-mono" style={{ fontSize: '0.875rem', color: totalPercentage > 100 ? '#ef4444' : 'var(--color-text-muted)' }}>
          {totalPercentage}%
        </span>
      </div>
      
      {menuRecipes.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p className="text-muted">No recipes in menu yet. Add recipes from the library on the left.</p>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {menuRecipes.map((recipe) => {
              const uniqueId = recipe.instanceId || recipe.recipeId;
              return (
              <div
                key={uniqueId}
                className="card"
                style={{ marginBottom: '0.75rem', padding: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, flex: 1 }}>
                    {recipe.title}
                  </h4>
                  <button
                    onClick={() => onRemoveRecipe(uniqueId)}
                    className="btn"
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.5rem',
                      background: 'transparent',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-muted)'
                    }}
                  >
                    × Remove
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                      Role
                    </label>
                    <select
                      value={recipe.role}
                      onChange={(e) => onUpdateRole(uniqueId, e.target.value as any)}
                      className="input-field"
                      style={{ fontSize: '0.875rem', padding: '0.5rem' }}
                    >
                      <option value="Main">Main</option>
                      <option value="Side">Side</option>
                      <option value="Filler">Filler</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-muted" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>
                      Target %
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="range"
                        value={recipe.targetPercentage}
                        onChange={(e) => onUpdatePercentage(uniqueId, Number(e.target.value))}
                        min="0"
                        max="100"
                        style={{ flex: 1, cursor: 'pointer' }}
                      />
                      <div style={{ position: 'relative', width: '60px' }}>
                        <input
                          type="number"
                          value={recipe.targetPercentage}
                          onChange={(e) => onUpdatePercentage(uniqueId, Number(e.target.value))}
                          className="input-field"
                          style={{ 
                            fontSize: '0.875rem', 
                            padding: '0.25rem 0.5rem', 
                            width: '100%',
                            textAlign: 'right',
                            paddingRight: '1.25rem'
                          }}
                          min="0"
                          max="100"
                        />
                        <span style={{ 
                          position: 'absolute', 
                          right: '0.25rem', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          fontSize: '0.75rem',
                          color: 'var(--color-text-muted)',
                          pointerEvents: 'none'
                        }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span className="text-muted">Scale: {recipe.scaleFactor.toFixed(2)}×</span>
                  <span className="text-mono text-muted">{(recipe.scaledMass / 1000).toFixed(2)} kg</span>
                </div>
              </div>
            )})}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span className="text-muted">Total Mass:</span>
              <span className="text-mono">{(totalMass / 1000).toFixed(2)} kg</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
