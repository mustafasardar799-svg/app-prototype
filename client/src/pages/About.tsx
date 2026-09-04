import { Screen } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { roleLabel } from '../lib/format';

export default function About() {
  const { user } = useAuth();

  return (
    <Screen title="About" back>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand)' }}>EliaVit</div>
        <p className="muted" style={{ marginTop: 6 }}>Pharmaceutical field-sales record app</p>
        <p className="muted" style={{ fontSize: 12.5 }}>Version 1.0.0 · prototype</p>
      </div>

      <div className="section-title">What it does</div>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          Medical representatives record orders, returns, bonuses, expenses, collected money,
          visits and calls from the field. Team leaders and the general sales manager see the same
          records rolled up per staff member, zone, company and product.
        </p>
        <p style={{ marginBottom: 0 }}>
          You are signed in as <strong>{user?.name}</strong> ({roleLabel(user?.role || '')}), so you
          can see {user?.role === 'rep' ? 'your own records' : user?.role === 'supervisor' ? 'your team’s records' : 'every record in the company'}.
        </p>
      </div>

      <div className="section-title">Roles</div>
      <div className="list">
        <div className="row" style={{ display: 'block' }}>
          <strong>Medical Representative</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
            Records their own sales activity and manages their own customer list.
          </div>
        </div>
        <div className="row" style={{ display: 'block' }}>
          <strong>Team Leader</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
            Sees their own work plus every representative reporting to them.
          </div>
        </div>
        <div className="row" style={{ display: 'block' }}>
          <strong>General Sales Manager</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
            Sees the whole company: all staff, all zones, all products.
          </div>
        </div>
      </div>
    </Screen>
  );
}
