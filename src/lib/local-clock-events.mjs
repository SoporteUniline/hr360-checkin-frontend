const visibleStates = new Set(['pending', 'review', 'decision']);

export function selectLocalClockEvents(events, { user, session, company, from, to, search = '' } = {}) {
  if (!user || !session) return [];
  const hr = ['Recruiter', 'User'].includes(user.tipo_usuario);
  const employee = user.tipo_usuario === 'Empleado';
  if (!hr && !employee) return [];
  const details = user.empresas_detalle || [];
  const assigned = new Set([...(user.empresas || []).map(Number), ...details.map(item => Number(item.id_empresa))]);
  const query = search.trim().toLocaleLowerCase('es-MX');
  return events.filter(event => {
    if (!visibleStates.has(event.status)) return false;
    if (company && company !== 'all' && Number(event.company) !== Number(company)) return false;
    if (hr) {
      if (event.scope !== 'company' || !assigned.has(Number(event.company))) return false;
    } else {
      if (Number(event.company) !== Number(user.id_empresa)) return false;
      if (event.scope === 'company') {
        if (!event.local_validated || Number(event.local_employee) !== Number(user.id_empleado)) return false;
      } else if (Number(event.employee) !== Number(user.id_empleado) || event.session !== session) return false;
    }
    const captured = new Date(event.captured_at);
    if (!Number.isFinite(captured.getTime())) return false;
    const timezone = details.find(item => Number(item.id_empresa) === Number(event.company))?.zona_horaria || user.zona_horaria || 'America/Mexico_City';
    let parts;
    try { parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(captured); }
    catch { parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(captured); }
    const date = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
    if ((from && date < from) || (to && date > to)) return false;
    return !query || [event.employeeName, event.alias, event.code].filter(Boolean).join(' ').toLocaleLowerCase('es-MX').includes(query);
  }).sort((a, b) => b.captured_at.localeCompare(a.captured_at));
}
