const conflictCodes = new Set(['CLOCK_ENTRY_ALREADY_OPEN', 'CLOCK_EXIT_WITHOUT_ENTRY', 'CLOCK_MOVEMENT_OUT_OF_ORDER']);
const legacyConflicts = new Set([
  'Ya existe una entrada abierta. Requiere revisión de RH.',
  'No existe una entrada abierta para esta salida. Requiere revisión de RH.',
  'Existe una checada posterior o a la misma hora. Requiere revisión de RH.',
]);

export const isTurnConflict = event => conflictCodes.has(event.errorCode) || legacyConflicts.has(event.error);

export function validClockState(state, company, employee) {
  return !!state && Number(state.company) === Number(company) && Number(state.employee) === Number(employee) &&
    Number.isSafeInteger(state.revision) && state.revision >= 0 && typeof state.open === 'boolean';
}
