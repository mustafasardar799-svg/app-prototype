import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type TeamMember } from '../lib/api';
import { useAuth } from '../lib/auth';
import { daysAgo, initials, money, roleLabel, shortDate, today } from '../lib/format';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { Meter } from '../components/Charts';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { IconTarget, IconUsers } from '../components/Icons';

/** Manager / team-leader view: how each staff member performed in a period. */
export default function Team() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [range, setRange] = useState({ from: daysAgo(30), to: today() });
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [pace, setPace] = useState<number | undefined>();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editingTarget, setEditingTarget] = useState<TeamMember | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api
      .team(range)
      .then((data) => {
        setMembers(data.members);
        setPace(data.pace);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    setMembers(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  async function saveTarget(event: React.FormEvent) {
    event.preventDefault();
    if (!editingTarget) return;
    setSavingTarget(true);
    try {
      await api.setTarget(editingTarget.id, Number(targetValue) || 0);
      toast(`Target set for ${editingTarget.name}`);
      setEditingTarget(null);
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not set the target', 'error');
    } finally {
      setSavingTarget(false);
    }
  }

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
      {!members && !error && <Skeleton height={76} count={4} />}

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
          {members.length === 0 && (
            <Empty
              icon={<IconUsers size={26} />}
              headline="No staff yet"
              text="Representatives assigned to you will appear here."
            />
          )}

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

                {member.target > 0 && (
                  <div style={{ padding: '0 14px 12px' }}>
                    <Meter
                      label="Target"
                      value={member.netTotal}
                      target={member.target}
                      currency={user?.currency}
                      pace={pace}
                    />
                  </div>
                )}

                {expanded === member.id && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div className="table-wrap">
                      <table>
                        <tbody>
                          <Detail label="Gross sales" value={money(member.salesTotal, user?.currency)} />
                          <Detail label="Returns" value={money(member.returnsTotal, user?.currency)} />
                          <Detail
                            label="Target"
                            value={member.target ? money(member.target, user?.currency) : 'Not set'}
                          />
                          <Detail
                            label="Attainment"
                            value={member.attainment != null ? `${member.attainment}%` : '—'}
                          />
                          <Detail label="Collected" value={money(member.collected, user?.currency)} />
                          <Detail label="Expenses" value={money(member.expenses, user?.currency)} />
                          <Detail label="Visits / calls" value={`${member.visits} / ${member.calls}`} />
                          <Detail label="Last activity" value={shortDate(member.lastActivity)} />
                          <Detail label="Phone" value={member.phone || '—'} />
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="btn small ghost" onClick={() => navigate(`/report?userId=${member.id}`)}>
                        View sales report
                      </button>
                      <button
                        className="btn small ghost"
                        onClick={() => {
                          setEditingTarget(member);
                          setTargetValue(String(member.target || ''));
                        }}
                      >
                        <IconTarget size={16} /> Set target
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {editingTarget && (
        <Sheet title={`Monthly target — ${editingTarget.name}`} onClose={() => setEditingTarget(null)}>
          <form onSubmit={saveTarget}>
            <div className="field">
              <label htmlFor="target">Target ({user?.currency || 'IQD'})</label>
              <input
                id="target" className="control" type="number" min={0} inputMode="decimal"
                value={targetValue} onChange={(event) => setTargetValue(event.target.value)}
                placeholder="0" autoFocus
              />
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
              Net sales this rep is expected to reach each month. Set 0 to remove the target.
            </p>
            <div className="sheet-actions">
              <button className="btn ghost" type="button" onClick={() => setEditingTarget(null)}>Cancel</button>
              <button className="btn" disabled={savingTarget}>{savingTarget ? 'Saving…' : 'Save target'}</button>
            </div>
          </form>
        </Sheet>
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
