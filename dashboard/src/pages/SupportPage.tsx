import { useState } from 'react';
import PublicLayout from '../components/PublicLayout';
import { API_BASE } from '../api/client';

export default function SupportPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit support request');
      }
      
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit support request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout title="Help & Support">
      <div className="grid gap-8 md:grid-cols-5">
        {/* Contact Info */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#1A3C34] mb-2">Frequently Asked Questions</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold">How do I verify my email address?</p>
                <p className="text-sm text-[#6B7280]">Check your inbox (and spam folder) for the verification email sent after registration. Click the verification link to fully activate your account and start sending properties to buyers.</p>
              </div>
              <div>
                <p className="font-semibold">How are MAO values calculated?</p>
                <p className="text-sm text-[#6B7280]">Our analyzer follows the standard 70% rule: ARV × 0.70 minus estimated repair costs and your wholesale fee.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-bold text-[#1A3C34] mb-1">Direct Contact</h3>
            <p className="text-sm text-[#6B7280]">
              If you have urgent account inquiries or transaction errors, you can contact us directly at{' '}
              <a href="mailto:Propertiesbysardar@gmail.com" className="font-semibold text-[#1A3C34] hover:underline">
                Propertiesbysardar@gmail.com
              </a>
              .
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-3">
          <div className="rounded-2xl border border-black/5 bg-[#F9F6F1]/50 p-6">
            <h3 className="text-lg font-bold text-[#1A3C34] mb-4">Submit a Support Ticket</h3>
            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-center space-y-2">
                <div className="text-xl">✅</div>
                <div className="font-bold">Ticket Submitted Successfully</div>
                <p className="text-xs text-emerald-700">Our support engineers will review your request and reply to you via email within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} className="mt-2 text-xs font-semibold underline text-emerald-800 hover:text-emerald-900">Submit another ticket</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Your Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 outline-none focus:border-[#1A3C34]" placeholder="Marcus Sadar" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 outline-none focus:border-[#1A3C34]" placeholder="you@company.com" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Subject</label>
                  <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 outline-none focus:border-[#1A3C34]" placeholder="e.g. Domain Verification Issue" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#8A8A8A]">Description</label>
                  <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 outline-none focus:border-[#1A3C34]" placeholder="Describe your issue or question in detail..." />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</div>
                )}
                <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-[#1A3C34] text-white font-bold disabled:opacity-60 transition">
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
