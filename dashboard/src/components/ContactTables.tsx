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
      columns={['Owner Name', 'Phone', 'Email', 'Mailing Address', '']}
      rows={sellers.map((seller) => (
        <tr key={seller.id} className="border-t border-slate-800">
          <td className="px-4 py-2">
            <EditableCell value={seller.ownerName} onSave={(ownerName) => onUpdate({ ...seller, ownerName })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={seller.phone} onSave={(phone) => onUpdate({ ...seller, phone })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={seller.email} type="email" onSave={(email) => onUpdate({ ...seller, email })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={seller.mailingAddress}
              onSave={(mailingAddress) => onUpdate({ ...seller, mailingAddress })}
            />
          </td>
          <td className="px-4 py-2 text-right">
            <button type="button" onClick={() => onDelete(seller.id)} className="text-xs text-rose-400 hover:underline">
              Delete
            </button>
          </td>
        </tr>
      ))}
    />
  );
}

interface BuyersTableProps {
  buyers: Buyer[];
  onUpdate: (buyer: Buyer) => void;
  onDelete: (id: string) => void;
}

export function BuyersTable({ buyers, onUpdate, onDelete }: BuyersTableProps) {
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
            <button type="button" onClick={() => onDelete(buyer.id)} className="text-xs text-rose-400 hover:underline">
              Delete
            </button>
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
}

export function InvestorsTable({ investors, onUpdate, onDelete }: InvestorsTableProps) {
  return (
    <ContactTableShell
      emptyMessage="No investors yet."
      isEmpty={!investors.length}
      columns={['Investor Name', 'Company', 'Phone', 'Email', 'LinkedIn', 'States', 'Cities', 'Types', 'Max Budget', '']}
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
          <td className="px-4 py-2">
            <EditableCell value={investor.phone} onSave={(phone) => onUpdate({ ...investor, phone })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell value={investor.email} type="email" onSave={(email) => onUpdate({ ...investor, email })} />
          </td>
          <td className="px-4 py-2">
            <EditableCell
              value={investor.linkedInUrl}
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
            <button type="button" onClick={() => onDelete(investor.id)} className="text-xs text-rose-400 hover:underline">
              Delete
            </button>
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