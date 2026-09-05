import { Screen } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { roleKey, useT } from '../lib/i18n';

export default function About() {
  const { user } = useAuth();
  const t = useT();

  return (
    <Screen title={t('about')} back>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand)' }}>{t('appName')}</div>
        <p className="muted" style={{ marginTop: 6 }}>{t('aboutTagline')}</p>
        <p className="muted" style={{ fontSize: 12.5 }}>{t('aboutVersion')}</p>
      </div>

      <div className="section-title">{t('whatItDoes')}</div>
      <div className="card">
        <p style={{ marginTop: 0 }}>{t('aboutBody')}</p>
        <p style={{ marginBottom: 0 }}>
          {t('aboutSignedInAs', {
            name: user?.name || '',
            role: t(roleKey(user?.role || '')),
            scope: t(
              user?.role === 'rep' ? 'scopeOwn' : user?.role === 'supervisor' ? 'scopeTeam' : 'scopeAll',
            ),
          })}
        </p>
      </div>

      <div className="section-title">{t('roles')}</div>
      <div className="list">
        <div className="row" style={{ display: 'block' }}>
          <strong>{t('roleRep')}</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
            {t('roleRepText')}
          </div>
        </div>
        <div className="row" style={{ display: 'block' }}>
          <strong>{t('roleSupervisor')}</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
            {t('roleSupervisorText')}
          </div>
        </div>
        <div className="row" style={{ display: 'block' }}>
          <strong>{t('roleManager')}</strong>
          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
            {t('roleManagerText')}
          </div>
        </div>
      </div>
    </Screen>
  );
}
