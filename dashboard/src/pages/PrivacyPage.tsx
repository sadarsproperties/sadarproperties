import PublicLayout from '../components/PublicLayout';

export default function PrivacyPage() {
  return (
    <PublicLayout title="Privacy Policy">
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">1. Information We Collect</h2>
        <p>
          Sadar Properties collects properties and lead details that you manually input, import via CSV files, or scan using our services. This includes property addresses, estimated repair costs, asking prices, motivated seller contact information, and cash buyer contact details.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">2. How We Use Your Information</h2>
        <p>
          We use your input information solely to provide real estate deal analysis calculations, buyer matching, and automated email notifications using verified APIs (such as Resend). We do not rent, sell, or share your proprietary deal leads or buyer rosters with external third parties.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">3. Data Security and Encryption</h2>
        <p>
          All communications between your browser and our platform are encrypted in transit using SSL/TLS. Your data is stored securely in an isolated PostgreSQL instance. Access to database tables is strictly limited to authorized API queries triggered by your authenticated session.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[#1A3C34]">4. Cookies and Sessions</h2>
        <p>
          We use functional cookies to manage your authentication state and protect routes. No marketing or tracking cookies are utilized within the dashboard platform.
        </p>
      </section>

      <div className="pt-6 border-t text-xs text-[#8A8A8A]">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </PublicLayout>
  );
}
