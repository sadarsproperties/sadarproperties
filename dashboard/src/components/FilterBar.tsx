import { LEAD_CATEGORIES, PROPERTY_TYPES } from '../types';
import type { FilterState, PriceBracket } from '../types';
import { PRICE_BRACKET_LABELS } from '../utils/filters';
import { TagButton } from './TagButton';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const priceBrackets = Object.keys(PRICE_BRACKET_LABELS) as PriceBracket[];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const toggle = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search address, city, notes..."
          className="min-w-[220px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
        <TagButton
          label="Under $10k · < 4 hrs"
          active={filters.under10kLast4Hours}
          onClick={() => onChange({ ...filters, under10kLast4Hours: !filters.under10kLast4Hours })}
          tone="amber"
        />
        <TagButton
          label="New leads · 24 hrs"
          active={filters.newLeads24Hours}
          onClick={() => onChange({ ...filters, newLeads24Hours: !filters.newLeads24Hours })}
          tone="green"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Property Types</p>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <TagButton
              key={type}
              label={type}
              active={filters.propertyTypes.includes(type)}
              onClick={() =>
                onChange({
                  ...filters,
                  propertyTypes: toggle(filters.propertyTypes, type),
                })
              }
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Lead Categories</p>
        <div className="flex flex-wrap gap-2">
          {LEAD_CATEGORIES.map((category) => (
            <TagButton
              key={category}
              label={category}
              active={filters.leadCategories.includes(category)}
              onClick={() =>
                onChange({
                  ...filters,
                  leadCategories: toggle(filters.leadCategories, category),
                })
              }
              tone="amber"
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Price Brackets</p>
        <div className="flex flex-wrap gap-2">
          {priceBrackets.map((bracket) => (
            <TagButton
              key={bracket}
              label={PRICE_BRACKET_LABELS[bracket]}
              active={filters.priceBrackets.includes(bracket)}
              onClick={() =>
                onChange({
                  ...filters,
                  priceBrackets: toggle(filters.priceBrackets, bracket),
                })
              }
              tone="green"
            />
          ))}
        </div>
      </div>
    </div>
  );
}