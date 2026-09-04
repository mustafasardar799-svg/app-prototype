import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type TeamMember } from '../lib/api';
import { useAuth } from '../lib/auth';
import { daysAgo, initials, money, roleLabel, shortDate, today } from '../lib/format';
import { Empty, Screen, Spinner } from '../components/Layout';

/** Manager / team-leader view: how each staff member performed in a period. */
export default function Team() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState({ from: daysAgo(30), to: today() });
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setMembers(null);
    api.team(range).then((data) => setMembers(data.members)).catch((err) => setError(err.message));
  }, [range]);

  const totals = (members || []).reduce(
    (sum, member) => ({
      net: sum.net + member.netTotal,
      orders: sum.orders + member.orders,
      collected: sum.collected + member.collected,
      expenses: sum.expenses + member.expenses,
    }),
    { net: 0, orders: 0, collected: 0, expenses: 0 },
  );

  return (
    <Screen title="Team Activity">
      <div className="card">
        <div className="field-row" style={{ marginBottom: 0 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="from">From</label>
            <input
              id="from" type="date" className="control" value={range.from}
              onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="to">To</label>
            <input
              id="to" type="date" className="control" value={range.to}
              onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}
      {!members && !error && <Spinner />}

      {members && (
        <>
          <div className="section-title">Team totals</div>
          <div className="kpis">
            <div className="kpi">
              <div className="label">Net sales</div>
              <div className="value">{money(totals.net, user?.currency)}</div>
            </div>
            <div className="kpi">
              <div className="label">Orders</div>
              <div className="value">{totals.orders}</div>
            </div>
            <div className="kpi">
              <div className="label">Collected</div>
              <div className="value">{money(totals.collected, user?.currency)}</div>
            </div>
            <div className="kpi">
              <div className="label">Expenses</div>
              <div className="value">{money(totals.expenses, user?.currency)}</div>
            </div>
          </div>

          <div className="section-title">Staff ({members.length})</div>
          {members.length === 0 && <Empty text="Nobody reports to you yet." />}

          <div className="list">
            {members.map((member) => (
              <div key={member.id} className="card" style={{ padding: 0 }}>
                <button
                  className="row"
                  style={{ boxShadow: 'none', background: 'transparent' }}
                  onClick={() => setExpanded(expanded === member.id ? null : member.id)}
                >
                  <span className="avatar">{initials(member.name)}</span>
                  <span className="grow">
                    <span className="title">{member.name}</span>
                    <span className="sub">
                      {roleLabel(member.role)} · {member.zone}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="amount" style={{ display: 'block' }}>
                      {money(member.netTotal, user?.currency)}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {member.orders} order{member.orders === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>

                {expanded === member.id && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div className="table-wrap">
                      <table>
                        <tbody>
                          <Detail label="Gross sales" value={money(member.salesTotal, user?.currency)} />
                          <Detail label="Returns" value={money(member.returnsTotal, user?.currency)} />
                          <Detail label="Collected" value={money(member.collected, user?.currency)} />
                          <Detail label="Expenses" value={money(member.expenses, user?.currency)} />
                          <Detail label="Visits / calls" value={`${member.visits} / ${member.calls}`} />
                          <Detail label="Last activity" value={shortDate(member.lastActivity)} />
                          <Detail label="Phone" value={member.phone || '—'} />
                        </tbody>
                      </table>
                    </div>
                    <button
                      className="btn small ghost"
                      style={{ marginTop: 10 }}
                      onClick={() => navigate(`/report?userId=${member.id}`)}
                    >
                      View sales report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="muted">{label}</td>
      <td className="num" style={{ fontWeight: 600 }}>{value}</td>
    </tr>
  );
}
