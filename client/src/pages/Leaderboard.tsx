import { useEffect, useState } from 'react';
import { api, type LeaderboardRow } from '../lib/api';
import { useAuth } from '../lib/auth';
import { initials, money, roleLabel } from '../lib/format';
import { Empty, Screen, Skeleton } from '../components/Layout';
import { IconTrophy } from '../components/Icons';

/**
 * Where each rep stands this month. Reps see it too — a field team that can
 * see the board pushes itself harder than one waiting for a monthly email.
 */
export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.leaderboard().then((data) => setRows(data.rows)).catch((err) => setError(err.message));
  }, []);

  const me = rows?.find((row) => row.isMe);

  return (
    <Screen title="Ranking">
      {error && <div className="alert error">{error}</div>}
      {!rows && !error && <Skeleton height={70} count={4} />}

      {rows && (
        <>
          {me && (
            <div className="hero" style={{ marginBottom: 4 }}>
              <div className="hero-head">
                <span className="label">Your position this month</span>
                <strong>#{me.rank} of {rows.length}</strong>
              </div>
              <div className="hero-figure">
                {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(me.net)}
                <span>{user?.currency || 'IQD'}</span>
              </div>
              {me.attainment != null && (
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                  {me.attainment}% of your {money(me.target, user?.currency)} target
                </div>
              )}
            </div>
          )}

          <div className="section-title">This month, by net sales</div>
          {rows.length === 0 && (
            <Empty icon={<IconTrophy size={26} />} headline="Nobody ranked yet" text="Records will appear as the team sells." />
          )}

          <div className="list">
            {rows.map((row) => (
              <div
                key={row.id}
                className="row"
                style={row.isMe ? { outline: '2px solid var(--brand)', outlineOffset: -2 } : undefined}
              >
                <span className={`rank${row.rank <= 3 ? ' top' : ''}`}>{row.rank}</span>
                <span className="avatar">{initials(row.name)}</span>
                <span className="grow">
                  <span className="title">
                    {row.name}
                    {row.isMe ? ' · you' : ''}
                  </span>
                  <span className="sub">
                    {roleLabel(row.role)} · {row.orders} order{row.orders === 1 ? '' : 's'}
                  </span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="amount" style={{ display: 'block' }}>
                    {money(row.net, user?.currency)}
                  </span>
                  {row.attainment != null && (
                    <span
                      className={`pill ${row.attainment >= 100 ? 'good' : row.attainment >= 60 ? '' : 'warn'}`}
                      style={{ marginTop: 3 }}
                    >
                      {row.attainment}% of target
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}
