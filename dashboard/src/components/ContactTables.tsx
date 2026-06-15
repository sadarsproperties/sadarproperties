import { BUYER_TYPES, PROPERTY_TYPES, type Buyer, type Investor, type Seller } from '../types';
import { EditableCell } from './EditableCell';

const inputClass =
  'w-full min-w-[100px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-sky-500 focus:bg-slate-950';

interface SellersTableProps {
  sellers: Seller[];
  onUpdate: (seller: Seller) => void;
  onDelete: (id: string) => void;
}

export function SellersTable({ sellers, onUpdate, onDelete }: SellersTableProps) {
  return (
    <ContactTableShell
      emptyMessage="No sellers yet. Import CSV, add manually, or load sample data."
      isEmpty={!sellers.length}
      columns={[
        'Owner Name',
        'Phone Numbers',
        'Email Addresses',
        'Mailing Address',
        'Ownership Type',
        'Company/Entity',
        'Equity Est ($)',
        'Years Owned',
        'Skip Traced',
        'Last Contact',
        'Notes',
        ''
      ]}
      rows={sellers.map((seller) => {
        const pNumbers = Array.isArray(seller.phoneNumbers) ? seller.phoneNumbers : [seller.phone || ''];
        const eAddresses = Array.isArray(seller.emailAddresses) ? seller.emailAddresses : [seller.email || ''];
        return (
          <tr key={seller.id} className="border-t border-black/5 hover:bg-black/5 transition">
            <td className="px-4 py-3">
              <EditableCell value={seller.ownerName} onSave={(ownerName) => onUpdate({ ...seller, ownerName })} />
            </td>
            <td className="px-4 py-3">
              <EditableCell 
                value={pNumbers.join(', ')} 
                onSave={(value) => onUpdate({ ...seller, phoneNumbers: splitList(value), phone: splitList(value)[0] || '' })} 
              />
            </td>
            <td className="px-4 py-3">
              <EditableCell 
                value={eAddresses.join(', ')} 
                onSave={(value) => onUpdate({ ...seller, emailAddresses: splitList(value), email: splitList(value)[0] || '' })} 
              />
            </td>
            <td className="px-4 py-3">
              <EditableCell
                value={seller.mailingAddress || ''}
                onSave={(mailingAddress) => onUpdate({ ...seller, mailingAddress })}
              />
            </td>
            <td className="px-4 py-3">
              <select
                value={seller.ownershipType || 'Individual'}
                onChange={(e) => onUpdate({ ...seller, ownershipType: e.target.value as any })}
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm outline-none focus:border-[#1A3C34]"
              >
                <option value="Individual">Individual</option>
                <option value="LLC/Entity">LLC/Entity</option>
              </select>
            </td>
            <td className="px-4 py-3">
              <EditableCell
                value={seller.entityName || ''}
                onSave={(entityName) => onUpdate({ ...seller, entityName })}
              />
            </td>
            <td className="px-4 py-3">
              <EditableCell
                value={seller.equityEstimate != null ? seller.equityEstimate.toString() : ''}
                type="number"
                onSave={(val) => onUpdate({ ...seller, equityEstimate: val ? Number(val) : null })}
              />
            </td>
            <td className="px-4 py-3">
              <EditableCell
                value={seller.ownershipYears != null ? seller.ownershipYears.toString() : ''}
                type="number"
                onSave={(val) => onUpdate({ ...seller, ownershipYears: val ? parseInt(val, 10) : null })}
              />
            </td>
            <td className="px-4 py-3 text-center">
              <input 
                type="checkbox" 
                checked={!!seller.skipTraced} 
                onChange={(e) => onUpdate({ ...seller, skipTraced: e.target.checked })} 
                className="h-4 w-4 rounded border-black/10 text-[#1A3C34] focus:ring-[#1A3C34]"
              />
            </td>
            <td className="px-4 py-3">
              <input 
                type="date" 
                value={seller.lastContactDate ? seller.lastContactDate.slice(0, 10) : ''} 
                onChange={(e) => onUpdate({ ...seller, lastContactDate: e.target.value })} 
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm outline-none focus:border-[#1A3C34]"
              />
            </td>
            <td className="px-4 py-3">
              <EditableCell
                value={seller.contactNotes || ''}
                onSave={(contactNotes) => onUpdate({ ...seller, contactNotes })}
              />
            </td>
            <td className="px-4 py-3 text-right">
              <button type="button" onClick={() => onDelete(seller.id)} className="text-xs font-semibold text-rose-500 hover:underline">
                Delete
              </button>
            </td>
          </tr>
        );
      })}
    />
  );
}

interface BuyersTableProps {
  buyers: Buyer[];
  onUpdate: (buyer: Buyer) => void;
  onDelete: (id: string) => void;
  onOpenDrawer: (buyer: Buyer) => void;
}

export function BuyersTable({ buyers, onUpdate, onDelete, onOpenDrawer }: BuyersTableProps) {
  return (
    <ContactTableShell
      emptyMessage="No buyers yet."
      isEmpty={!buyers.length}
      columns={['Full Name', 'Company', 'Phone', 'Email', 'Buyer Type', 'States', 'Cities', 'Types', 'Max Budget', '']}
      rows={buyers.map((buyer) => (
        <tr key={buyer.id} className="border-t border-slate-800">
          <td className="px-4 py-2">
            <EditableCell value={buyer.fullName} onSave={(fullName) => onUpdate({ ...buyer, fullName })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={buyer.companyName} onSave={(companyName) => onUpdate({ ...buyer, companyName })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={buyer.phone} onSave={(phone) => onUpdate({ ...buyer, phone })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={buyer.email} type="email" onSave={(email) => onUpdate({ ...buyer, email })} />
          </td>
          <td className="px-4 py-2">
            <select
              value={buyer.buyerType}
              onChange={(event) => onUpdate({ ...buyer, buyerType: event.target.value as Buyer['buyerType'] })}
              className={inputClass}
            >
              {BUYER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={buyer.buyBox.preferredStates.join(', ')}
              onSave={(value) =>
                onUpdate({
                  ...buyer,
                  buyBox: { ...buyer.buyBox, preferredStates: splitList(value) },
                })
              }
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={buyer.buyBox.preferredCities.join(', ')}
              onSave={(value) =>
                onUpdate({
                  ...buyer,
                  buyBox: { ...buyer.buyBox, preferredCities: splitList(value) },
                })
              }
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={buyer.buyBox.desiredPropertyTypes.join(', ')}
              onSave={(value) =>
                onUpdate({
                  ...buyer,
                  buyBox: {
                    ...buyer.buyBox,
                    desiredPropertyTypes: splitList(value).filter((item): item is Buyer['buyBox']['desiredPropertyTypes'][number] =>
                      PROPERTY_TYPES.includes(item as Buyer['buyBox']['desiredPropertyTypes'][number])
                    ),
                  },
                })
              }
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={buyer.buyBox.maxBudget?.toString() ?? ''}
              type="number"
              onSave={(value) =>
                onUpdate({
                  ...buyer,
                  buyBox: { ...buyer.buyBox, maxBudget: value ? Number(value) : null },
                })
              }
            />
          </td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => onOpenDrawer(buyer)} className="text-xs text-sky-400 hover:underline">
                Details
              </button>
              <button type="button" onClick={() => onDelete(buyer.id)} className="text-xs text-rose-400 hover:underline">
                Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    />
  );
}

interface InvestorsTableProps {
  investors: Investor[];
  onUpdate: (investor: Investor) => void;
  onDelete: (id: string) => void;
  onOpenDrawer: (investor: Investor) => void;
}

export function InvestorsTable({ investors, onUpdate, onDelete, onOpenDrawer }: InvestorsTableProps) {
  return (
    <ContactTableShell
      emptyMessage="No investors yet."
      isEmpty={!investors.length}
      columns={['Investor Name', 'Company', 'Source', 'AI', 'Phone', 'Email', 'LinkedIn', 'States', 'Cities', 'Types', 'Max Budget', '']}
      rows={investors.map((investor) => (
        <tr key={investor.id} className="border-t border-slate-800">
          <td className="px-4 py-2">
            <EditableCell
              value={investor.investorName}
              onSave={(investorName) => onUpdate({ ...investor, investorName })}
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={investor.companyName} onSave={(companyName) => onUpdate({ ...investor, companyName })} />
          </td>
          <td className="px-4 py-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 font-semibold border border-slate-200">
              {investor.sourcePlatform || 'Manual'}
            </span>
          </td>
          <td className="px-4 py-2 text-xs">
            {investor.aiExtracted ? (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 font-bold border border-emerald-200">
                AI
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </td>
          <td className="px-4 py-2">
            <EditableCell value={investor.phone} onSave={(phone) => onUpdate({ ...investor, phone })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={investor.email} type="email" onSave={(email) => onUpdate({ ...investor, email })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={investor.linkedInUrl || ''}
              type="url"
              onSave={(linkedInUrl) => onUpdate({ ...investor, linkedInUrl })}
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={investor.buyBox.preferredStates.join(', ')}
              onSave={(value) =>
                onUpdate({
                  ...investor,
                  buyBox: { ...investor.buyBox, preferredStates: splitList(value) },
                })
              }
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={investor.buyBox.preferredCities.join(', ')}
              onSave={(value) =>
                onUpdate({
                  ...investor,
                  buyBox: { ...investor.buyBox, preferredCities: splitList(value) },
                })
              }
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={investor.buyBox.desiredPropertyTypes.join(', ')}
              onSave={(value) =>
                onUpdate({
                  ...investor,
                  buyBox: {
                    ...investor.buyBox,
                    desiredPropertyTypes: splitList(value).filter((item): item is Investor['buyBox']['desiredPropertyTypes'][number] =>
                      PROPERTY_TYPES.includes(item as Investor['buyBox']['desiredPropertyTypes'][number])
                    ),
                  },
                })
              }
            />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={investor.buyBox.maxBudget?.toString() ?? ''}
              type="number"
              onSave={(value) =>
                onUpdate({
                  ...investor,
                  buyBox: { ...investor.buyBox, maxBudget: value ? Number(value) : null },
                })
              }
            />
          </td>
          <td className="px-4 py-2 text-right">
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => onOpenDrawer(investor)} className="text-xs text-sky-400 hover:underline">
                Details
              </button>
              <button type="button" onClick={() => onDelete(investor.id)} className="text-xs text-rose-400 hover:underline">
                Delete
              </button>
            </div>
          </td>
        </tr>
      ))}
    />
  );
}

function ContactTableShell({
  columns,
  rows,
  isEmpty,
  emptyMessage,
}: {
  columns: string[];
  rows: React.ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#F9F6F1] text-xs uppercase tracking-wide text-[#6B7280]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">{rows}</tbody>
      </table>
      {isEmpty && <p className="px-4 py-8 text-center text-sm text-[#6B7280]">{emptyMessage}</p>}
    </div>
  );
}

function splitList(value: string) {
  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}