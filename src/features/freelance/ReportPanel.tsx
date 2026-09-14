import { Fragment, useMemo, useState } from 'react';
import { Document, Page, StyleSheet, Text, View, PDFDownloadLink } from '@react-pdf/renderer';
import { FileDown } from 'lucide-react';
import { useAppData } from '../../app/AppDataProvider';
import {
  buildPublicReport,
  compareReportSessions,
  defaultReportSessionIds,
  reportFileName,
  reportPeriodLabel,
  type PublicReport,
} from '../../lib/report';
import { euro } from '../../lib/format';
import { Empty } from '../../components/ui/Modal';

const accent = '#0A84FF';
const pdfStyles = StyleSheet.create({
  page: { paddingTop: 38, paddingHorizontal: 46, paddingBottom: 54, fontFamily: 'Helvetica', color: '#15171A', fontSize: 9.5, lineHeight: 1.45, backgroundColor: '#FFFFFF' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 13, borderBottomWidth: 0.7, borderBottomColor: '#E4E7EB' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mark: { height: 18, flexDirection: 'row', alignItems: 'center' },
  markLetter: { fontFamily: 'Helvetica-Bold', fontSize: 17, lineHeight: 1, letterSpacing: -0.7 },
  markDot: { fontFamily: 'Helvetica-Bold', fontSize: 17, lineHeight: 1, color: accent },
  brandName: { marginTop: 0.5, fontFamily: 'Helvetica-Bold', fontSize: 10.5, lineHeight: 1 },
  site: { color: '#6D737C', fontSize: 8.5 },
  heading: { paddingTop: 23, paddingBottom: 19 },
  eyebrow: { color: accent, fontFamily: 'Helvetica-Bold', fontSize: 7.5, letterSpacing: 1.25, marginBottom: 7 },
  client: { fontFamily: 'Helvetica-Bold', fontSize: 24, letterSpacing: -0.5 },
  project: { marginTop: 9, fontFamily: 'Helvetica-Bold', color: '#3A3F46', fontSize: 11 },
  period: { marginTop: 11, color: '#454B54', fontSize: 10.5 },
  generated: { marginTop: 2, color: '#888E97', fontSize: 8.5 },
  summary: { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 15, marginBottom: 24, borderRadius: 5, backgroundColor: '#F6F7F9' },
  metric: { flexGrow: 1, flexBasis: 0 },
  metricDivider: { borderLeftWidth: 0.7, borderLeftColor: '#DEE2E7', paddingLeft: 15 },
  metricValue: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: '#15171A' },
  metricLabel: { marginTop: 2, color: '#747A83', fontSize: 7.5 },
  dayStart: { marginTop: 11 },
  dayHeading: { marginBottom: 8, color: '#59606A', fontFamily: 'Helvetica-Bold', fontSize: 7.8, letterSpacing: 1.05, textTransform: 'uppercase' },
  session: { width: '100%', paddingVertical: 10, borderBottomWidth: 0.6, borderBottomColor: '#E7E9ED' },
  sessionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, lineHeight: 1.3 },
  sessionProject: { marginTop: 2, color: '#717780', fontSize: 8 },
  description: { marginTop: 5, color: '#41464D', fontSize: 9.2, lineHeight: 1.5 },
  sessionMeta: { width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7 },
  sessionDetails: { flexGrow: 1, color: '#777D86', fontSize: 8.2 },
  amount: { width: 90, fontFamily: 'Helvetica-Bold', color: '#1B1E22', fontSize: 9.5, textAlign: 'right' },
  footerSite: { position: 'absolute', left: 46, bottom: 23, color: '#989DA5', fontSize: 7.5 },
  // `top` évite un défaut de pagination de react-pdf avec `bottom` et le texte dynamique multipage.
  footerPage: { position: 'absolute', right: 46, top: 806, width: 74, color: '#989DA5', fontSize: 7.5, textAlign: 'right' },
});

function ReportSession({ session, report }: { session: PublicReport['sessions'][number]; report: PublicReport }) {
  const details = [
    report.includeDurations ? session.duration : '',
    report.includeRate ? `${euro(session.rate)} / h` : '',
  ].filter(Boolean).join('  |  ');
  return (
    <View style={pdfStyles.session} wrap={false}>
      <Text style={pdfStyles.sessionTitle}>{session.title}</Text>
      {session.project ? <Text style={pdfStyles.sessionProject}>{session.project}</Text> : null}
      {session.description ? <Text style={pdfStyles.description}>{session.description}</Text> : null}
      {(details || report.includeAmounts) ? (
        <View style={pdfStyles.sessionMeta}>
          <Text style={pdfStyles.sessionDetails}>{details}</Text>
          {report.includeAmounts ? <Text style={pdfStyles.amount}>{euro(session.amount)}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function groupReportSessions(sessions: PublicReport['sessions']) {
  return sessions.reduce<Array<{ key: string; label: string; sessions: PublicReport['sessions'] }>>((result, session) => {
    const current = result.at(-1);
    if (current?.key === session.dateKey) current.sessions.push(session);
    else result.push({ key: session.dateKey, label: session.date, sessions: [session] });
    return result;
  }, []);
}

export function ReportDocument({ report }: { report: PublicReport }) {
  const groups = groupReportSessions(report.sessions);

  return (
    <Document title={`Rapport d’activité - ${report.client}`} author={report.issuer}>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.footerSite} fixed>{report.site}</Text>
        <Text style={pdfStyles.footerPage} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        <View style={pdfStyles.topbar}>
          <View style={pdfStyles.brand}>
            <View style={pdfStyles.mark}>
              <Text style={pdfStyles.markLetter}>R</Text><Text style={pdfStyles.markDot}>.</Text>
            </View>
            <Text style={pdfStyles.brandName}>Rayzk</Text>
          </View>
          <Text style={pdfStyles.site}>{report.site}</Text>
        </View>
        <View style={pdfStyles.heading}>
          <Text style={pdfStyles.eyebrow}>RAPPORT D’ACTIVITÉ</Text>
          <Text style={pdfStyles.client}>{report.client}</Text>
          {report.project ? <Text style={pdfStyles.project}>{report.project}</Text> : null}
          <Text style={pdfStyles.period}>{report.period}</Text>
          <Text style={pdfStyles.generated}>Généré le {report.generatedAt}</Text>
        </View>
        <View style={pdfStyles.summary} wrap={false}>
          <View style={pdfStyles.metric}>
            <Text style={pdfStyles.metricValue}>{report.sessions.length}</Text><Text style={pdfStyles.metricLabel}>Sessions</Text>
          </View>
          <View style={[pdfStyles.metric, pdfStyles.metricDivider]}>
            <Text style={pdfStyles.metricValue}>{report.totalDuration}</Text><Text style={pdfStyles.metricLabel}>Temps travaillé</Text>
          </View>
          {report.includeAmounts ? (
            <View style={[pdfStyles.metric, pdfStyles.metricDivider]}>
              <Text style={pdfStyles.metricValue}>{euro(report.total)}</Text><Text style={pdfStyles.metricLabel}>Valeur totale</Text>
            </View>
          ) : null}
        </View>
        {groups.map((group) => {
          const [first, ...rest] = group.sessions;
          return (
            <Fragment key={group.key}>
              <View style={pdfStyles.dayStart} wrap={false}>
                <Text style={pdfStyles.dayHeading}>{group.label}</Text>
                <ReportSession session={first} report={report} />
              </View>
              {rest.map((session) => <ReportSession session={session} report={report} key={session.id} />)}
            </Fragment>
          );
        })}
      </Page>
    </Document>
  );
}

export function ReportPanel({ clientId, projectId }: { clientId: string; projectId?: string }) {
  const { allocations, clients, projects, sessions, settings } = useAppData();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // undefined = sélection initiale non payée, null = sélection manuelle de toutes les sessions.
  const [selected, setSelected] = useState<string[] | null | undefined>(undefined);
  const [durations, setDurations] = useState(true);
  const [rate, setRate] = useState(false);
  const [amounts, setAmounts] = useState(true);
  const client = clients.find((item) => item.id === clientId);
  const project = projects.find((item) => item.id === projectId);
  const baseSessions = useMemo(() => sessions
    .filter((item) => item.client_id === clientId && !item.is_running && (!projectId || item.project_id === projectId))
    .slice()
    .sort(compareReportSessions), [clientId, projectId, sessions]);
  const available = useMemo(() => baseSessions.filter((item) => (!from || item.session_date >= from) && (!to || item.session_date <= to)), [baseSessions, from, to]);
  const defaultSelected = useMemo(() => defaultReportSessionIds(baseSessions, allocations), [allocations, baseSessions]);
  const selectedIds = selected === undefined ? defaultSelected : selected === null ? available.map((item) => item.id) : selected;
  const picked = available.filter((item) => selectedIds.includes(item.id));
  const report = useMemo(() => client ? buildPublicReport(settings, client, project, picked, {
    period: reportPeriodLabel(picked, from, to), includeDurations: durations, includeRate: rate, includeAmounts: amounts,
  }) : null, [amounts, client, durations, from, picked, project, rate, settings, to]);
  const previewGroups = useMemo(() => groupReportSessions(report?.sessions ?? []), [report?.sessions]);

  if (!client || !report) return null;
  const toggle = (id: string) => setSelected((current) => {
    const currentIds = current === undefined ? defaultSelected : current === null ? available.map((item) => item.id) : current;
    return currentIds.includes(id) ? currentIds.filter((value) => value !== id) : [...currentIds, id];
  });

  return (
    <section className="report-panel report-v053">
      <header><p className="eyebrow">Étape 1</p><h3>Sessions et période</h3></header>
      <div className="field-row">
        <label className="field"><span>Date de début</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="field"><span>Date de fin</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <div className="report-select-actions">
        <button className="text-link" onClick={() => setSelected(null)}>Tout sélectionner</button>
        <button className="text-link" onClick={() => setSelected([])}>Tout désélectionner</button>
      </div>
      {available.length ? <div className="report-sessions">{available.map((item) => (
        <button className={`report-session-choice ${selectedIds.includes(item.id) ? 'selected' : ''}`} key={item.id} onClick={() => toggle(item.id)}>
          <span><b>{item.session_date} · {item.title || 'Session de travail'}</b><small>{item.project_id ? projects.find((value) => value.id === item.project_id)?.name : 'Sans mission'} · {item.duration_minutes} min · {euro(Number(item.gross_amount))}</small></span><i />
        </button>
      ))}</div> : <Empty>Aucune session dans cette période.</Empty>}
      <header><p className="eyebrow">Étape 2</p><h3>Contenu du PDF</h3></header>
      <div className="report-options custom-toggles">
        <Toggle checked={durations} onChange={setDurations} label="Afficher la durée de chaque session" />
        <Toggle checked={rate} onChange={setRate} label="Afficher le tarif horaire appliqué" detail="Ajoute le tarif utilisé à côté de chaque session." />
        <Toggle checked={amounts} onChange={setAmounts} label="Afficher le montant de chaque session" />
      </div>
      <div className="report-preview" aria-label="Aperçu du rapport PDF">
        <div className="report-preview-topbar">
          <span className="report-preview-brand"><b>R<span>.</span></b> Rayzk</span>
          <span>{report.site}</span>
        </div>
        <div className="report-preview-heading">
          <span>APERÇU DU RAPPORT</span>
          <strong>{report.client}</strong>
          {report.project ? <b>{report.project}</b> : null}
          <small>{report.period}</small>
        </div>
        <div className={`report-preview-summary ${amounts ? '' : 'two'}`}>
          <span><strong>{report.sessions.length}</strong><small>Sessions</small></span>
          <span><strong>{report.totalDuration}</strong><small>Temps travaillé</small></span>
          {amounts ? <span><strong>{euro(report.total)}</strong><small>Valeur totale</small></span> : null}
        </div>
        <div className="report-preview-sessions">
          {previewGroups.length ? previewGroups.map((group) => (
            <section className="report-preview-day" key={group.key}>
              <h5>{group.label}</h5>
              {group.sessions.map((item) => {
                const details = [
                  durations ? item.duration : '',
                  rate ? `${euro(item.rate)} / h` : '',
                ].filter(Boolean).join(' · ');
                return (
                  <article className="report-preview-session" key={item.id}>
                    <strong>{item.title}</strong>
                    {item.project ? <small className="report-preview-project">{item.project}</small> : null}
                    {item.description ? <p>{item.description}</p> : null}
                    {(details || amounts) ? (
                      <div><small>{details}</small>{amounts ? <b>{euro(item.amount)}</b> : null}</div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          )) : <p className="report-preview-empty">Sélectionnez au moins une session pour prévisualiser le rapport.</p>}
        </div>
      </div>
      {picked.length > 0 ? <PDFDownloadLink document={<ReportDocument report={report} />} fileName={reportFileName(client.name)} className="button primary report-download">{({ loading }) => <><FileDown size={16} /> {loading ? 'Préparation…' : 'Télécharger le PDF'}</>}</PDFDownloadLink> : null}
    </section>
  );
}

function Toggle({ checked, onChange, label, detail }: { checked: boolean; onChange: (value: boolean) => void; label: string; detail?: string }) {
  return <button type="button" role="checkbox" aria-checked={checked} className={`custom-toggle ${checked ? 'selected' : ''}`} onClick={() => onChange(!checked)}><i aria-hidden="true" /><span><b>{label}</b>{detail ? <small>{detail}</small> : null}</span></button>;
}
