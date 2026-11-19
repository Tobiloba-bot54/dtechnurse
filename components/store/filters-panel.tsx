'use client';
import type { CategoryAttribute, CategorySummary } from '@/lib/services/store/types';

export function FiltersPanel({
  attributes,
  selected,
  categories,
  activeCategory,
  onChange,
  onCategory,
}: {
  attributes: CategoryAttribute[];
  selected: Record<string, string[]>;
  categories: CategorySummary[];
  activeCategory?: string;
  onChange: (next: Record<string, string[]>) => void;
  onCategory: (slug: string) => void;
}) {
  const hasSelections = Object.values(selected).some(values => Array.isArray(values) && values.length > 0);

  function toggleValue(attributeSlug: string, value: string) {
    const current = selected[attributeSlug] ?? [];
    const next = current.includes(value) ? current.filter(entry => entry !== value) : [...current, value];
    onChange({ ...selected, [attributeSlug]: next });
  }

  return (
    <aside className="filters-panel" id="categories" aria-label="Filter products">
      {categories.length > 0 && (
        <div className="filter-group">
          <h4>Categories</h4>
          {!activeCategory && <button type="button" className="filter-option" aria-pressed="true">✓ All categories</button>}
          {activeCategory && <button type="button" className="filter-option" onClick={() => onCategory('')}>All categories</button>}
          {categories.map(category => category.slug === activeCategory
            ? <button key={category.id} type="button" className="filter-option" aria-pressed="true">✓ {category.name}</button>
            : <button key={category.id} type="button" className="filter-option" onClick={() => onCategory(category.slug)}>{category.name}</button>)}
        </div>
      )}
      {attributes.map(attribute => (
        <div className="filter-group" key={attribute.id}>
          <h4>{attribute.name}</h4>
          {attribute.values.map(value => {
            const active = (selected[attribute.slug] ?? []).includes(value.value);
            return (
              <label key={value.id} className="filter-option">
                <input type="checkbox" checked={active} onChange={() => toggleValue(attribute.slug, value.value)} />
                <span>{value.label}</span>
              </label>
            );
          })}
        </div>
      ))}
      {hasSelections && <button type="button" className="button secondary small" onClick={() => onChange({})}>Clear filters</button>}
    </aside>
  );
}
