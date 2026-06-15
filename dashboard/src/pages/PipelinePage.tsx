import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { api } from '../api/client';
import { calculateMetrics, formatCurrency } from '../utils/calculations';
import AppLayout from '../components/AppLayout';
import { ExportMenu } from '../components/ExportMenu';
import type { Property, Seller, Buyer, Investor, NoteEntry } from '../types';

type TabType = 'new' | 'contacted' | 'followup' | 'sellers' | 'buyers' | 'investors';

interface PropertyCardProps {
  property: Property;
  sellers: Seller[];
  buyers: Buyer[];
  investors: Investor[];
  onOpenNotes: (target: { type: 'property'; id: string; name: string; notesList: NoteEntry[] }) => void;
  onOpenStage: (property: Property) => void;
  onOpenAssign: (property: Property) => void;
  onMoveStage: (propertyId: string, stage: string) => void;
}

function PropertyCard({
  property,
  sellers,
  buyers,
  investors,
  onOpenNotes,
  onOpenStage,
  onOpenAssign,
  onMoveStage
}: PropertyCardProps) {
  // Helper: Find Seller Info
  const seller = useMemo(() => {
    if (property.sellerId) {
      const s = sellers.find(x => x.id === property.sellerId);
      if (s) return s;
    }
    const match = sellers.find(x => x.propertyId === property.id);
    return match || null;
  }, [property, sellers]);

  // Helper: Find Assigned Buyer Info
  const assignedName = useMemo(() => {
    if (!property.assignedBuyerId) return null;
    const b = buyers.find(x => x.id === property.assignedBuyerId);
    if (b) return `${b.fullName} (Buyer)`;
    const inv = investors.find(x => x.id === property.assignedBuyerId);
    if (inv) return `${inv.investorName} (Investor)`;
    return 'Assigned Contact';
  }, [property.assignedBuyerId, buyers, investors]);

  const daysInStage = useMemo(() => {
    return property.createdAt
      ? Math.max(0, Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 3600 * 24)))
      : 0;
  }, [property.createdAt]);

  const score = property.dealScore ?? null;

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 flex flex-col justify-between hover:border-black/10 hover:shadow-md transition duration-300">
      <div>
        {/* Header: Score & Address */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-[#1A3C34] text-sm">{property.address}</h4>
            <p className="text-xs text-[#5A6672]">{property.city}, {property.state}</p>
          </div>
          {score !== null ? (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide ${
              score >= 70
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : score >= 50
                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              SCORE {score}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] text-slate-400 border border-slate-200">N/A</span>
          )}
        </div>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Price:</span>
          <span className="text-base font-black text-[#1A3C34]">{formatCurrency(property.price)}</span>
        </div>

        {/* Category tags */}
        {property.leadCategories && property.leadCategories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {property.leadCategories.map(cat => (
              <span key={cat} className="rounded-lg bg-[#1A3C34]/5 px-2 py-0.5 text-[10px] font-semibold text-[#1A3C34] border border-[#1A3C34]/10">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Seller details */}
        <div className="mt-3.5 border-t border-black/5 pt-3 text-xs space-y-1.5 text-slate-600">
          <p className="flex justify-between">
            <span className="text-slate-450">Seller:</span>
            <span className="font-bold text-slate-700">{seller?.ownerName || 'Unknown'}</span>
          </p>
          {seller?.phone && (
            <p className="flex justify-between">
              <span className="text-slate-450">Phone:</span>
              <span className="font-semibold text-slate-700">{seller.phone}</span>
            </p>
          )}
          <p className="flex justify-between">
            <span className="text-slate-450">Stage Days:</span>
            <span className="font-semibold text-slate-700">{daysInStage}d active</span>
          </p>
          {property.lastContactDate && (
            <p className="flex justify-between">
              <span className="text-slate-450">Last Contact:</span>
              <span className="font-semibold text-slate-700">{property.lastContactDate}</span>
            </p>
          )}
          {property.followUpDate && (
            <p className="flex justify-between">
              <span className="text-slate-450">Follow-up:</span>
              <span className="text-rose-600 font-bold">{property.followUpDate}</span>
            </p>
          )}
          {assignedName && (
            <p className="flex justify-between items-center bg-emerald-500/5 text-emerald-700 px-2.5 py-1 rounded-xl border border-emerald-500/10 mt-2 text-[11px]">
              <span className="font-medium">Assigned To:</span>
              <span className="font-black">{assignedName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="mt-4 border-t border-black/5 pt-3">
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          {seller?.phone ? (
            <a
              href={`tel:${seller.phone}`}
              className="rounded-2xl border border-black/10 bg-slate-550/5 px-3 py-2 text-center text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1"
            >
              📞 Call Seller
            </a>
          ) : (
            <button
              disabled
              className="rounded-2xl border border-black/5 bg-slate-50/40 px-3 py-2 text-[10px] text-slate-400 cursor-not-allowed flex items-center justify-center gap-1"
            >
              📞 No Phone
            </button>
          )}

          <button
            onClick={() => onOpenNotes({ type: 'property', id: property.id, name: property.address, notesList: property.notesList || [] })}
            className="rounded-2xl border border-black/10 bg-slate-550/5 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1"
          >
            📝 Notes ({property.notesList?.length || 0})
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOpenStage(property)}
            className="rounded-2xl border border-black/10 bg-slate-550/5 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1"
          >
            🔄 Stage
          </button>
          <button
            onClick={() => onOpenAssign(property)}
            className="rounded-2xl border border-black/10 bg-slate-550/5 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition flex items-center justify-center gap-1"
          >
            👥 Assign Buyer
          </button>
        </div>

        {/* Fast Status buttons */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onMoveStage(property.id, 'under_contract')}
            className="rounded-2xl border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-[9px] font-bold text-purple-700 hover:bg-purple-500/10 transition"
          >
            🤝 Contract Deal
          </button>
          <button
            onClick={() => onMoveStage(property.id, 'closed')}
            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-500/10 transition"
          >
            🎉 Close Deal
          </button>
        </div>
      </div>
    </div>
  );
}

interface ContactCardProps {
  contact: any;
  type: 'seller' | 'buyer' | 'investor';
  name: string;
  company: string;
  onOpenNotes: (target: { type: 'seller' | 'buyer' | 'investor'; id: string; name: string; notesList: NoteEntry[] }) => void;
}

function ContactCard({ contact, type, name, company, onOpenNotes }: ContactCardProps) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 flex flex-col justify-between hover:border-black/10 hover:shadow-md transition duration-300">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-[#1A3C34] text-sm">{name}</h4>
            <p className="text-xs text-[#5A6672]">{company}</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
            type === 'seller'
              ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20'
              : type === 'buyer'
              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
              : 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20'
          }`}>
            {type}
          </span>
        </div>

        <div className="mt-3.5 space-y-1.5 text-xs text-slate-650">
          {contact.phone && (
            <p className="flex justify-between">
              <span className="text-slate-450">Phone:</span>
              <span className="font-semibold text-slate-700">{contact.phone}</span>
            </p>
          )}
          {contact.email && (
            <p className="flex justify-between">
              <span className="text-slate-450">Email:</span>
              <span className="font-semibold text-slate-700">{contact.email}</span>
            </p>
          )}
          {contact.mailingAddress && (
            <p className="flex justify-between">
              <span className="text-slate-450">Address:</span>
              <span className="font-semibold text-slate-700 truncate max-w-[150px]">{contact.mailingAddress}</span>
            </p>
          )}
          {contact.lastContactDate && (
            <p className="flex justify-between">
              <span className="text-slate-450">Last Contact:</span>
              <span className="font-semibold text-slate-700">{contact.lastContactDate}</span>
            </p>
          )}
          {contact.linkedInUrl && (
            <a
              href={contact.linkedInUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:underline"
            >
              🔗 LinkedIn Profile
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 border-t border-black/5 pt-3 flex gap-2">
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex-1 rounded-2xl border border-black/10 bg-slate-550/5 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            📞 Call
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex-1 rounded-2xl border border-black/10 bg-slate-550/5 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            ✉️ Email
          </a>
        )}
        <button
          onClick={() => onOpenNotes({ type, id: contact.id, name, notesList: contact.notesList || [] })}
          className="flex-1 rounded-2xl border border-black/10 bg-slate-550/5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
        >
          📝 Note ({contact.notesList?.length || 0})
        </button>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const { data, refresh, loading } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('new');

  // Modal states
  const [noteTarget, setNoteTarget] = useState<{ type: 'property' | 'seller' | 'buyer' | 'investor'; id: string; name: string; notesList: NoteEntry[] } | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  const [stageTarget, setStageTarget] = useState<Property | null>(null);
  const [followUpTarget, setFollowUpTarget] = useState<Property | null>(null);
  const [followUpDateStr, setFollowUpDateStr] = useState('');

  const [assignTarget, setAssignTarget] = useState<Property | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

  // Auto-load follow-up date string when target is set
  useEffect(() => {
    if (followUpTarget) {
      setFollowUpDateStr(followUpTarget.followUpDate?.split('T')[0] || '');
    }
  }, [followUpTarget]);

  // Compute records for tabs
  const newLeads = useMemo(() => {
    return data.properties.filter(p => !p.status || p.status.toLowerCase() === 'new');
  }, [data.properties]);

  const contactedLeads = useMemo(() => {
    return data.properties.filter(p => p.status?.toLowerCase() === 'contacted');
  }, [data.properties]);

  const followUpLeads = useMemo(() => {
    return data.properties.filter(p => !!p.followUpDate && p.followUpDate !== '');
  }, [data.properties]);

  // Actions
  const handleSaveNote = async () => {
    if (!noteTarget || !newNoteText.trim()) return;

    const newNote: NoteEntry = {
      id: Math.random().toString(36).substr(2, 9),
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newNote, ...noteTarget.notesList];

    try {
      if (noteTarget.type === 'property') {
        await api.updateProperty(noteTarget.id, { notesList: updatedList } as any);
      } else if (noteTarget.type === 'seller') {
        await api.updateSeller(noteTarget.id, { notesList: updatedList } as any);
      } else if (noteTarget.type === 'buyer') {
        await api.updateBuyer(noteTarget.id, { notesList: updatedList } as any);
      } else if (noteTarget.type === 'investor') {
        await api.updateInvestor(noteTarget.id, { notesList: updatedList } as any);
      }
      setNewNoteText('');
      setNoteTarget(prev => prev ? { ...prev, notesList: updatedList } : null);
      await refresh();
    } catch (err) {
      alert('Failed to save note');
    }
  };

  const handleMoveStage = async (propertyId: string, newStatus: string) => {
    try {
      await api.updateProperty(propertyId, { status: newStatus } as any);
      setStageTarget(null);
      await refresh();
    } catch (err) {
      alert('Failed to update stage');
    }
  };

  const handleSaveFollowUpDate = async () => {
    if (!followUpTarget) return;
    try {
      await api.updateProperty(followUpTarget.id, { followUpDate: followUpDateStr } as any);
      setFollowUpTarget(null);
      await refresh();
    } catch (err) {
      alert('Failed to save follow-up date');
    }
  };

  const handleAssignBuyer = async (propertyId: string, contactId: string | null) => {
    try {
      await api.updateProperty(propertyId, { assignedBuyerId: contactId } as any);
      setAssignTarget(null);
      await refresh();
    } catch (err) {
      alert('Failed to assign buyer');
    }
  };

  // Helper: All contacts list for assignment
  const allContactsForAssignment = useMemo(() => {
    const list: { id: string; name: string; type: 'Buyer' | 'Investor'; company: string }[] = [];
    data.buyers.forEach(b => {
      list.push({ id: b.id, name: b.fullName, type: 'Buyer', company: b.companyName });
    });
    data.investors.forEach(inv => {
      list.push({ id: inv.id, name: inv.investorName, type: 'Investor', company: inv.companyName });
    });
    return list;
  }, [data.buyers, data.investors]);

  const filteredContactsForAssignment = useMemo(() => {
    if (!assignSearch.trim()) return allContactsForAssignment;
    const q = assignSearch.toLowerCase();
    return allContactsForAssignment.filter(c =>
      c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)
    );
  }, [allContactsForAssignment, assignSearch]);

  const { exportRowsForTab, exportFilenameForTab } = useMemo(() => {
    switch (activeTab) {
      case 'new':
        return { exportRowsForTab: newLeads, exportFilenameForTab: 'crm-new-leads' };
      case 'contacted':
        return { exportRowsForTab: contactedLeads, exportFilenameForTab: 'crm-contacted-leads' };
      case 'followup':
        return { exportRowsForTab: followUpLeads, exportFilenameForTab: 'crm-followup-leads' };
      case 'sellers':
        return { exportRowsForTab: data.sellers, exportFilenameForTab: 'crm-sellers' };
      case 'buyers':
        return { exportRowsForTab: data.buyers, exportFilenameForTab: 'crm-buyers' };
      case 'investors':
        return { exportRowsForTab: data.investors, exportFilenameForTab: 'crm-investors' };
      default:
        return { exportRowsForTab: [], exportFilenameForTab: 'crm-export' };
    }
  }, [activeTab, newLeads, contactedLeads, followUpLeads, data]);

  return (
    <AppLayout title="CRM Pipeline">
      {/* Header Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1A3C34]">Leads & Relationship Tracker</h2>
          <p className="text-xs text-slate-500">Manage pipeline stages, schedule follow-ups, and log customer communications.</p>
        </div>
        <div className="flex gap-2 items-center">
          <ExportMenu rows={exportRowsForTab as any} filename={exportFilenameForTab} />
          <button
            onClick={() => navigate('/lead-capture')}
            className="rounded-xl border border-[#1A3C34]/15 bg-white px-4 py-2 text-xs font-bold text-[#1A3C34] hover:bg-black/5 transition"
          >
            + Add New Lead
          </button>
        </div>
      </div>

      {/* 6 Tabs Menu */}
      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-black/5 pb-2">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-150 ${
            activeTab === 'new'
              ? 'bg-[#1A3C34]/10 text-[#1A3C34] border border-[#1A3C34]/20'
              : 'text-slate-500 hover:text-[#1A3C34]'
          }`}
        >
          📂 New Leads
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {newLeads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contacted')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-150 ${
            activeTab === 'contacted'
              ? 'bg-amber-550/10 text-amber-700 border border-amber-500/20'
              : 'text-slate-500 hover:text-[#1A3C34]'
          }`}
        >
          📞 Contacted
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {contactedLeads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('followup')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-150 ${
            activeTab === 'followup'
              ? 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
              : 'text-slate-500 hover:text-[#1A3C34]'
          }`}
        >
          🗓️ Follow Up
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {followUpLeads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sellers')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-150 ${
            activeTab === 'sellers'
              ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20'
              : 'text-slate-500 hover:text-[#1A3C34]'
          }`}
        >
          👤 Sellers
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {data.sellers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('buyers')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-150 ${
            activeTab === 'buyers'
              ? 'bg-[#1A3C34]/10 text-[#1A3C34] border border-[#1A3C34]/20'
              : 'text-slate-500 hover:text-[#1A3C34]'
          }`}
        >
          🤝 Buyers
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {data.buyers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('investors')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition duration-150 ${
            activeTab === 'investors'
              ? 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/20'
              : 'text-slate-500 hover:text-[#1A3C34]'
          }`}
        >
          💎 Investors
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
            {data.investors.length}
          </span>
        </button>
      </div>

      {loading && <div className="text-center text-xs text-slate-400 py-12">Loading CRM records...</div>}

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* NEW LEADS TAB */}
        {activeTab === 'new' && (
          newLeads.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-12 text-sm">No new leads available. Drag or add a new property.</div>
          ) : (
            newLeads.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                sellers={data.sellers}
                buyers={data.buyers}
                investors={data.investors}
                onOpenNotes={setNoteTarget}
                onOpenStage={setStageTarget}
                onOpenAssign={setAssignTarget}
                onMoveStage={handleMoveStage}
              />
            ))
          )
        )}

        {/* CONTACTED LEADS TAB */}
        {activeTab === 'contacted' && (
          contactedLeads.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-12 text-sm">No contacted leads available. Move stage on new leads to contact them.</div>
          ) : (
            contactedLeads.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                sellers={data.sellers}
                buyers={data.buyers}
                investors={data.investors}
                onOpenNotes={setNoteTarget}
                onOpenStage={setStageTarget}
                onOpenAssign={setAssignTarget}
                onMoveStage={handleMoveStage}
              />
            ))
          )
        )}

        {/* FOLLOW UP TAB */}
        {activeTab === 'followup' && (
          followUpLeads.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-12 text-sm">No scheduled follow-up leads. Set follow-up date on any property card.</div>
          ) : (
            followUpLeads.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                sellers={data.sellers}
                buyers={data.buyers}
                investors={data.investors}
                onOpenNotes={setNoteTarget}
                onOpenStage={setStageTarget}
                onOpenAssign={setAssignTarget}
                onMoveStage={handleMoveStage}
              />
            ))
          )
        )}

        {/* SELLERS TAB */}
        {activeTab === 'sellers' && (
          data.sellers.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-12 text-sm">No seller records found.</div>
          ) : (
            data.sellers.map(s => (
              <ContactCard
                key={s.id}
                contact={s}
                type="seller"
                name={s.ownerName}
                company={s.entityName || 'Individual'}
                onOpenNotes={setNoteTarget}
              />
            ))
          )
        )}

        {/* BUYERS TAB */}
        {activeTab === 'buyers' && (
          data.buyers.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-12 text-sm">No buyer records found.</div>
          ) : (
            data.buyers.map(b => (
              <ContactCard
                key={b.id}
                contact={b}
                type="buyer"
                name={b.fullName}
                company={b.companyName}
                onOpenNotes={setNoteTarget}
              />
            ))
          )
        )}

        {/* INVESTORS TAB */}
        {activeTab === 'investors' && (
          data.investors.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 py-12 text-sm">No investor records found.</div>
          ) : (
            data.investors.map(inv => (
              <ContactCard
                key={inv.id}
                contact={inv}
                type="investor"
                name={inv.investorName}
                company={inv.companyName}
                onOpenNotes={setNoteTarget}
              />
            ))
          )
        )}
      </div>

      {/* NOTES MODAL DIALOG */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-extrabold text-[#1A3C34]">Communication Notes</h3>
              <button onClick={() => setNoteTarget(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Record for: <span className="font-bold text-slate-700">{noteTarget.name}</span></p>

            {/* Note Editor */}
            <div className="mt-4">
              <textarea
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                rows={3}
                placeholder="Type your timestamped note here..."
                className="w-full rounded-2xl border border-black/10 bg-slate-50 p-3 text-sm text-slate-800 focus:border-[#1A3C34] focus:outline-none"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setNoteTarget(null)}
                  className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="rounded-2xl bg-[#1A3C34] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1A3C34]/90"
                >
                  Save Note
                </button>
              </div>
            </div>

            {/* Notes List */}
            <div className="mt-6 border-t border-black/5 pt-4 max-h-48 overflow-y-auto space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Notes</p>
              {noteTarget.notesList.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No notes recorded yet.</p>
              ) : (
                noteTarget.notesList.map(n => (
                  <div key={n.id} className="rounded-2xl border border-black/5 bg-slate-50/50 p-3 text-xs">
                    <p className="text-slate-700 font-medium">{n.text}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOVE STAGE MODAL DIALOG */}
      {stageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-extrabold text-[#1A3C34]">Update Lead Stage</h3>
              <button onClick={() => setStageTarget(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Address: <span className="font-bold text-slate-700">{stageTarget.address}</span></p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => handleMoveStage(stageTarget.id, 'new')}
                className="rounded-2xl border border-black/10 bg-slate-50 p-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                📂 Move to New Leads
              </button>
              <button
                onClick={() => handleMoveStage(stageTarget.id, 'contacted')}
                className="rounded-2xl border border-black/10 bg-slate-50 p-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                📞 Move to Contacted
              </button>
              <button
                onClick={() => {
                  setStageTarget(null);
                  setFollowUpTarget(stageTarget);
                }}
                className="rounded-2xl border border-black/10 bg-slate-50 p-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                🗓️ Schedule Follow Up callback
              </button>
              <button
                onClick={() => handleMoveStage(stageTarget.id, 'under_contract')}
                className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3 text-left text-xs font-semibold text-purple-700 hover:bg-purple-500/10 transition"
              >
                🤝 Mark Under Contract
              </button>
              <button
                onClick={() => handleMoveStage(stageTarget.id, 'closed')}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 transition"
              >
                🎉 Mark Closed Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE FOLLOW UP MODAL DIALOG */}
      {followUpTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-extrabold text-[#1A3C34]">Schedule Callback</h3>
              <button onClick={() => setFollowUpTarget(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Address: <span className="font-bold text-slate-700">{followUpTarget.address}</span></p>

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pick Date</label>
              <input
                type="date"
                value={followUpDateStr}
                onChange={e => setFollowUpDateStr(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-slate-550/5 p-2.5 text-sm text-slate-800 focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setFollowUpTarget(null)}
                  className="rounded-2xl border border-black/10 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFollowUpDate}
                  className="rounded-2xl bg-[#1A3C34] px-4 py-2 text-xs font-bold text-white hover:bg-[#1A3C34]/90"
                >
                  Save Date
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN BUYER MODAL DIALOG */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <h3 className="font-extrabold text-[#1A3C34]">Assign Buyer to Deal</h3>
              <button onClick={() => setAssignTarget(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Address: <span className="font-bold text-slate-700">{assignTarget.address}</span></p>

            {/* Search Box */}
            <div className="mt-4">
              <input
                type="text"
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                placeholder="Search by contact or company name..."
                className="w-full rounded-2xl border border-black/10 bg-slate-550/5 p-2.5 text-sm text-slate-800 focus:outline-none"
              />
            </div>

            {/* Contacts list */}
            <div className="mt-4 border border-black/5 bg-slate-50 rounded-2xl max-h-60 overflow-y-auto">
              <button
                onClick={() => handleAssignBuyer(assignTarget.id, null)}
                className="w-full p-3 text-left text-xs border-b border-black/5 hover:bg-slate-100 transition text-rose-600 font-semibold"
              >
                🚫 Remove Current Assignment
              </button>
              {filteredContactsForAssignment.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No matching contacts found.</p>
              ) : (
                filteredContactsForAssignment.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAssignBuyer(assignTarget.id, c.id)}
                    className="w-full p-3 text-left text-xs border-b border-black/5 hover:bg-slate-100 transition flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-450">{c.company || 'Individual'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                      c.type === 'Buyer' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-indigo-500/10 text-indigo-700'
                    }`}>
                      {c.type}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
