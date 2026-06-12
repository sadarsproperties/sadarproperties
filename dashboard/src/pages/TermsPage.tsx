import PublicLayout from '../components/PublicLayout';

export default function TermsPage() {
  return (
    <PublicLayout title="Terms of Service">
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">1. Acceptance of Terms</h2>
        <p>
          By creating an account or using WholesaleIQ, you agree to comply with and be bound by these terms. If you are entering into this agreement on behalf of a company or legal entity, you represent that you have the authority to bind such entity.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">2. Proper Platform Use</h2>
        <p>
          You agree to use WholesaleIQ solely for legitimate wholesale real estate analysis and transaction tracking. Any scraping of internal services, automated bulk spamming of matching buyers, or posting of fraudulent property data is strictly prohibited and will result in immediate account termination.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">3. Deal Communication & Delivery</h2>
        <p>
          WholesaleIQ facilitates deal distribution via third-party email APIs. You represent that you have obtained proper consent from all buyers, investors, or contacts before adding them to your notification rosters and triggering mailings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">4. Limitation of Liability</h2>
        <p>
          WholesaleIQ is a tool provided to assist with analysis and coordination. All calculations, including Max Allowable Offer (MAO) and deal scores, are estimations. Users must perform their own physical, legal, and financial due diligence before purchasing, contracting, or assigning any property.
        </p>
      </section>

      <div className="pt-6 border-t text-xs text-[#8A8A8A]">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </PublicLayout>
  );
}
