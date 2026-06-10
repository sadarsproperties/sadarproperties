import { useMemo } from 'react';
import { LEAD_CATEGORIES, PROPERTY_TYPES, type Buyer, type Investor, type LeadCategory, type Property, type Seller } from '../types';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import { findMatches } from '../utils/matching';
import { TagButton } from './TagButton';
import { ExportMenu } from './ExportMenu';

interface PropertyDrawerProps {
  property: Property;
  sellers: Seller[];
  buyers: Buyer[];
  investors: Investor[];
  onClose: () => void;
  onUpdate: (property: Property) => void;
}

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm';

export function PropertyDrawer({
  property,
  sellers,
  buyers,
  investors,
  onClose,
  onUpdate,
}: PropertyDrawerProps) {
  const metrics = useMemo(() => calculateMetrics(property), [property]);
  const matches = useMemo(() => findMatches(property, buyers, investors), [property, buyers, investors]);
  const seller = sellers.find((item) => item.id === property.sellerId);

  const updateField = <K extends keyof Property>(key: K, value: Property[K]) => {
    onUpdate({ ...property, [key]: value });
  };

  const toggleCategory = (category: LeadCategory) => {
    const next = property.leadCategories.includes(category)
      ? property.leadCategories.filter((item) => item !== category)
      : [...property.leadCategories, category];
    updateField('leadCategories', next);
  };

  const matchExportRows = matches.map((match) => ({
    name: match.name,
    company: match.companyName,
    phone: match.phone,
    email: match.email,
    type: match.type,
    buyerType: match.buyerType ?? '',
    linkedIn: match.linkedInUrl ?? '',
  }));

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-400">Property Profile</p>
            <h2 className="text-xl font-semibold">{property.address}</h2>
            <p className="text-sm text-slate-400">
              {property.city}, {property.state} {property.zip}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-1 text-sm hover:bg-slate-900"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <Metric label="List Price" value={formatCurrency(property.price)} />
            <Metric label="Deal Score" value={metrics.dealScore != null ? `${metrics.dealScore}/100` : '—'} />
            <Metric label="MAO" value={formatCurrency(metrics.mao)} />
            <Metric
              label="Suggested Offer"
              value={
                metrics.offerMin != null && metrics.offerMax != null
                  ? `${formatCurrency(metrics.offerMin)} – ${formatCurrency(metrics.offerMax)}`
                  : '—'
              }
            />
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field label="Address">
              <input
                value={property.address}
                onChange={(event) => updateField('address', event.target.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="City">
              <input value={property.city} onChange={(event) => updateField('city', event.target.value)} className={fieldClass} />
            </Field>
            <Field label="State">
              <input value={property.state} onChange={(event) => updateField('state', event.target.value)} className={fieldClass} />
            </Field>
            <Field label="ZIP">
              <input value={property.zip} onChange={(event) => updateField('zip', event.target.value)} className={fieldClass} />
            </Field>
            <Field label="List Price">
              <input
                type="number"
                value={property.price}
                onChange={(event) => updateField('price', Number(event.target.value) || 0)}
                className={fieldClass}
              />
            </Field>
            <Field label="Property Type">
              <select
                value={property.propertyType}
                onChange={(event) => updateField('propertyType', event.target.value as Property['propertyType'])}
                className={fieldClass}
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ARV">
              <input
                type="number"
                value={property.arv ?? ''}
                onChange={(event) => updateField('arv', event.target.value ? Number(event.target.value) : null)}
                className={fieldClass}
              />
            </Field>
            <Field label="Repair Costs">
              <input
                type="number"
                value={property.repairCosts ?? ''}
                onChange={(event) => updateField('repairCosts', event.target.value ? Number(event.target.value) : null)}
                className={fieldClass}
              />
            </Field>
            <Field label="Assignment Fee">
              <input
                type="number"
                value={property.assignmentFee}
                onChange={(event) => updateField('assignmentFee', Number(event.target.value) || 0)}
                className={fieldClass}
              />
            </Field>
          </section>

          <section>
            <p className="mb-2 text-sm text-slate-400">Lead Categories</p>
            <div className="flex flex-wrap gap-2">
              {LEAD_CATEGORIES.map((category) => (
                <TagButton
                  key={category}
                  label={category}
                  active={property.leadCategories.includes(category)}
                  onClick={() => toggleCategory(category)}
                  tone="amber"
                />
              ))}
            </div>
          </section>

          <section>
            <Field label="Notes">
              <textarea
                value={property.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                rows={3}
                className={fieldClass}
              />
            </Field>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Linked Seller</h3>
            <select
              value={property.sellerId ?? ''}
              onChange={(event) => updateField('sellerId', event.target.value || null)}
              className={fieldClass}
            >
              <option value="">No seller linked</option>
              {sellers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.ownerName}
                </option>
              ))}
            </select>
            {seller && (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
                <p>{seller.ownerName}</p>
                <p className="text-slate-400">{seller.phone}</p>
                <p className="text-slate-400">{seller.email}</p>
                <p className="text-slate-400">{seller.mailingAddress}</p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Matched Buyers & Investors</h3>
              <ExportMenu rows={matchExportRows} filename={`matches-${property.address}`} />
            </div>
            {matches.length ? (
              <div className="space-y-2">
                {matches.map((match) => (
                  <div
                    key={`${match.type}-${match.id}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{match.name}</p>
                      <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">
                        {match.type}
                      </span>
                    </div>
                    <p className="text-slate-400">{match.companyName}</p>
                    <p>{match.phone}</p>
                    <p>{match.email}</p>
                    {match.buyerType && <p className="text-slate-400">{match.buyerType}</p>}
                    {match.linkedInUrl && (
                      <a href={match.linkedInUrl} className="text-sky-400 hover:underline" target="_blank" rel="noreferrer">
                        LinkedIn
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No buyers or investors match this property's buy box yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      {children}
    </label>
  );
}