'use client';

import { useState } from 'react';
import { StagingRecipe } from '@/types/staging';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface ScaleViewProps {
  recipe: StagingRecipe;
  onBack: () => void;
  onSave?: (recipe: StagingRecipe) => Promise<void>;
}

export default function ScaleView({ recipe, onBack, onSave }: ScaleViewProps) {
  const [targetServings, setTargetServings] = useState(4);
  const [targetPortionSize, setTargetPortionSize] = useState(300);
  const [isCopied, setIsCopied] = useState(false);
  const [alsoSave, setAlsoSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const originalWeight = recipe.estimated_final_weight_g || 0;
  const targetTotalWeight = targetServings * targetPortionSize;
  const scalingFactor = originalWeight > 0 ? targetTotalWeight / originalWeight : 1;

  // Format weight for display
  const formatWeight = (grams: number): string => {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} kg`;
    }
    return `${grams.toFixed(0)}g`;
  };

  // Format ingredient quantity - handles to_taste flag
  const formatIngredientQty = (ing: { base_quantity_g?: number; is_to_taste?: boolean }): string => {
    if (ing.is_to_taste) return 'to taste';
    if (!ing.base_quantity_g) return '?';
    const scaled = ing.base_quantity_g * scalingFactor;
    if (scaled >= 1000) {
      return `${(scaled / 1000).toFixed(2)} kg`;
    }
    return `${scaled.toFixed(0)}g`;
  };

  // Generate text content for exports
  const generateTextContent = (): string => {
    const lines = [];
    lines.push(recipe.title);
    if (recipe.summary) lines.push(recipe.summary);
    lines.push('');
    
    lines.push(`Yield: ${targetServings} servings @ ${targetPortionSize}g each`);
    lines.push(`Total Weight: ${formatWeight(targetTotalWeight)}`);
    lines.push(`(Scaled ${scalingFactor.toFixed(2)}x from original ${formatWeight(originalWeight)})`);
    lines.push('');

    lines.push('Ingredients:');
    recipe.ingredients.forEach(ing => {
      const qty = formatIngredientQty(ing);
      const name = ing.name_normalized || ing.name_raw;
      lines.push(`- ${qty} ${name}`);
    });
    lines.push('');

    lines.push('Instructions:');
    recipe.steps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step.instruction_raw}`);
    });

    if (recipe.chefs_notes && recipe.chefs_notes.length > 0) {
      lines.push('');
      lines.push("Chef's Notes:");
      recipe.chefs_notes.forEach(note => lines.push(`- ${note}`));
    }

    if (recipe.source_url) {
      lines.push('');
      lines.push(`Source: ${recipe.source_url}`);
    }

    return lines.join('\n');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTextContent());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      if (alsoSave && onSave) {
        setIsSaving(true);
        try {
          await onSave(recipe);
        } finally {
          setIsSaving(false);
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download as .txt file
  const handleDownloadText = () => {
    const content = generateTextContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_')}_scaled.txt`;
    saveAs(blob, filename);
  };

  // Download as .docx file
  const handleDownloadDocx = async () => {
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Arial',
              size: 22, // 11pt = 22 half-points
            },
          },
          heading1: {
            run: {
              font: 'Arial',
              size: 26, // 13pt
              bold: true,
              color: '000000',
            },
          },
          heading2: {
            run: {
              font: 'Arial',
              size: 22, // 11pt
              bold: true,
              color: '000000',
            },
          },
        },
      },
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: recipe.title,
            heading: HeadingLevel.HEADING_1,
          }),
          ...(recipe.summary ? [new Paragraph({ 
            children: [new TextRun({ text: recipe.summary, font: 'Arial' })]
          })] : []),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: `Yield: ${targetServings} servings @ ${targetPortionSize}g each`, bold: true, font: 'Arial' }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: `Total Weight: ${formatWeight(targetTotalWeight)}`, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: `Scaled ${scalingFactor.toFixed(2)}x from original ${formatWeight(originalWeight)}`, font: 'Arial' })] }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Ingredients', heading: HeadingLevel.HEADING_2 }),
          ...recipe.ingredients.map(ing => 
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({ text: `${formatIngredientQty(ing)} `, bold: true, font: 'Arial' }),
                new TextRun({ text: ing.name_normalized || ing.name_raw, font: 'Arial' }),
              ],
            })
          ),
          new Paragraph({ text: '' }),
          new Paragraph({ text: 'Instructions', heading: HeadingLevel.HEADING_2 }),
          ...recipe.steps.flatMap((step, idx) => [
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. `, bold: true, font: 'Arial' }),
                new TextRun({ text: step.instruction_raw, font: 'Arial' }),
              ],
            }),
            new Paragraph({ text: '' }), // Add spacing between steps
          ]),
          ...(recipe.chefs_notes && recipe.chefs_notes.length > 0 ? [
            new Paragraph({ text: '' }),
            new Paragraph({ text: "Chef's Notes", heading: HeadingLevel.HEADING_2 }),
            ...recipe.chefs_notes.map(note => 
              new Paragraph({ 
                bullet: { level: 0 }, 
                children: [new TextRun({ text: note, font: 'Arial' })]
              })
            ),
          ] : []),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `${recipe.title.replace(/[^a-z0-9]/gi, '_')}_scaled.docx`;
    saveAs(blob, filename);
  };

  // Print / PDF
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recipe.title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11pt; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.4; }
          h1 { font-size: 13pt; font-weight: bold; margin-bottom: 0.5rem; }
          h2 { font-size: 11pt; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .meta { margin-bottom: 1.5rem; }
          ul { padding-left: 1.5rem; margin: 0.5rem 0; }
          ul li { margin: 0.25rem 0; }
          .instructions { margin: 0; padding: 0; list-style: none; }
          .instructions li { margin-bottom: 1rem; }
          .step-num { font-weight: bold; }
          .qty { font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>${recipe.title}</h1>
        ${recipe.summary ? `<p>${recipe.summary}</p>` : ''}
        <div class="meta">
          <strong>Yield: ${targetServings} servings @ ${targetPortionSize}g each</strong><br>
          Total Weight: ${formatWeight(targetTotalWeight)}<br>
          Scaled ${scalingFactor.toFixed(2)}x from original ${formatWeight(originalWeight)}
        </div>
        <h2>Ingredients</h2>
        <ul>
          ${recipe.ingredients.map(ing => 
            `<li><span class="qty">${formatIngredientQty(ing)}</span> ${ing.name_normalized || ing.name_raw}</li>`
          ).join('')}
        </ul>
        <h2>Instructions</h2>
        <ol class="instructions">
          ${recipe.steps.map((step, idx) => `<li><span class="step-num">${idx + 1}.</span> ${step.instruction_raw}</li>`).join('')}
        </ol>
        ${recipe.chefs_notes && recipe.chefs_notes.length > 0 ? `
          <h2>Chef's Notes</h2>
          <ul>${recipe.chefs_notes.map(note => `<li>${note}</li>`).join('')}</ul>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={onBack}
          className="btn btn-link"
          style={{ padding: 0, marginBottom: '1rem' }}
        >
          ← Back to Edit
        </button>
        
        <h2 style={{ margin: 0 }}>{recipe.title}</h2>
        {recipe.summary && (
          <p className="text-muted" style={{ margin: '0.5rem 0 0' }}>{recipe.summary}</p>
        )}
      </div>

      {/* Original Weight */}
      <div style={{ 
        padding: '1rem', 
        background: 'var(--color-bg-secondary)', 
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          Original Recipe Weight
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {formatWeight(originalWeight)}
        </div>
      </div>

      {/* Scaling Controls */}
      <div style={{ 
        padding: '1rem', 
        background: 'var(--color-primary-light)', 
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Scale To</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="number"
            value={targetServings}
            onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
            className="input-field"
            style={{ width: '80px', textAlign: 'center' }}
            min={1}
          />
          <span>servings</span>
          <span style={{ color: 'var(--color-text-muted)' }}>×</span>
          <input
            type="number"
            value={targetPortionSize}
            onChange={(e) => setTargetPortionSize(parseInt(e.target.value) || 100)}
            className="input-field"
            style={{ width: '80px', textAlign: 'center' }}
            min={50}
            step={50}
          />
          <span>g each</span>
          <span style={{ color: 'var(--color-text-muted)' }}>=</span>
          <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
            {formatWeight(targetTotalWeight)}
          </span>
        </div>

        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-primary)' }}>
          Scaling Factor: <strong>{scalingFactor.toFixed(2)}x</strong>
        </div>
      </div>

      {/* Scaled Ingredients */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Scaled Ingredients</h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          padding: '1rem',
          background: 'var(--color-bg-secondary)',
          borderRadius: '8px'
        }}>
          {recipe.ingredients.map((ing, index) => (
            <div 
              key={ing.id || index}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: 'white',
                borderRadius: '4px'
              }}
            >
              <span>{ing.name_normalized || ing.name_raw}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {formatIngredientQty(ing)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scaled Instructions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Instructions</h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          padding: '1rem',
          background: 'var(--color-bg-secondary)',
          borderRadius: '8px'
        }}>
          {recipe.steps.map((step, index) => (
            <div 
              key={step.id || index}
              style={{ 
                display: 'flex', 
                gap: '1rem',
                padding: '0.5rem',
                background: 'white',
                borderRadius: '4px'
              }}
            >
              <span style={{ 
                fontWeight: 'bold', 
                color: 'var(--color-primary)',
                minWidth: '1.5rem'
              }}>
                {index + 1}.
              </span>
              <span>{step.instruction_raw}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ 
        borderTop: '1px solid var(--color-border)', 
        paddingTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {onSave && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={alsoSave}
              onChange={(e) => setAlsoSave(e.target.checked)}
            />
            Also save original recipe to library
          </label>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn" onClick={onBack}>
            ← Back
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleCopy}
            disabled={isSaving}
          >
            {isCopied ? '✅ Copied!' : '📋 Copy'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleDownloadText}
          >
            📄 .txt
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleDownloadDocx}
          >
            📝 .docx
          </button>
          <button 
            className="btn btn-primary"
            onClick={handlePrint}
          >
            🖨️ Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
