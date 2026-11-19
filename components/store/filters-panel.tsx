// File: components/store/filters-panel.tsx
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
  const activeCount = Object.values(selected).reduce((sum, values) => sum + (Array.isArray(values) ? values.length : 0), 0);

  function toggleValue(attributeSlug: string, value: string) {
    const current = selected[attributeSlug] ?? [];
    const next = current.includes(value) ? current.filter(entry => entry !== value) : [...current, value];
    onChange({ ...selected, [attributeSlug]: next });
  }

  return (
    <aside className="filters-panel" id="categories" aria-label="Filter products">
      <div className="filters-panel-head">
        <h3>Filters</h3>
        {activeCount > 0 && <span className="filters-active-count">{activeCount} active</span>}
      </div>
      {categories.length > 0 && (
        <div className="filter-group">
          <h4>Categories</h4>
          <div className="filter-option-list">
            <button type="button" className={`filter-option${!activeCategory ? ' is-active' : ''}`} aria-pressed={!activeCategory} onClick={() => onCategory('')}>
              <span className="filter-option-check" aria-hidden="true" />
              <span>All categories</span>
            </button>
            {categories.map(category => {
              const active = category.slug === activeCategory;
              return (
                <button key={category.id} type="button" className={`filter-option${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => onCategory(category.slug)}>
                  <span className="filter-option-check" aria-hidden="true" />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {attributes.map(attribute => (
        <div className="filter-group" key={attribute.id}>
          <h4>{attribute.name}</h4>
          <div className="filter-option-list">
            {attribute.values.map(value => {
              const active = (selected[attribute.slug] ?? []).includes(value.value);
              return (
                <label key={value.id} className={`filter-option${active ? ' is-active' : ''}`}>
                  <input type="checkbox" checked={active} onChange={() => toggleValue(attribute.slug, value.value)} />
                  <span>{value.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {hasSelections && <button type="button" className="button secondary small filters-clear" onClick={() => onChange({})}>Clear all filters</button>}
    </aside>
  );
}
