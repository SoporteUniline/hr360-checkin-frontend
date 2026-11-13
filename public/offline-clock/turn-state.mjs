const conflictCodes = new Set(['CLOCK_ENTRY_ALREADY_OPEN', 'CLOCK_EXIT_WITHOUT_ENTRY', 'CLOCK_MOVEMENT_OUT_OF_ORDER']);
const legacyConflicts = new Set([
  'Ya existe una entrada abierta. Requiere revisión de RH.',
  'No existe una entrada abierta para esta salida. Requiere revisión de RH.',
  'Existe una checada posterior o a la misma hora. Requiere revisión de RH.',
]);

export const isTurnConflict = event => conflictCodes.has(event.errorCode) || legacyConflicts.has(event.error);

const invalidCaptureCodes = new Set([
  'FACE_NOT_MATCHED', 'CODE_NOT_MATCHED', 'CODE_NOT_FOUND',
  'METHOD_FACIAL_ONLY', 'METHOD_CODE_ONLY',
  'GPS_REQUIRED', 'GPS_REFRESH_REQUIRED', 'GPS_INACCURATE', 'GPS_OUTSIDE_AREA', 'OUTSIDE_AREA', 'AREA_INVALID',
]);
const legacyInvalidCaptures = new Set([
  'Código no encontrado o ambiguo en esta empresa',
  'Código de empleado incorrecto',
]);

// These attempts were definitively refused before an attendance was written.
// Keep their evidence for review, but do not make later valid attempts wait.
export const isInvalidCapture = event => invalidCaptureCodes.has(event.errorCode) || legacyInvalidCaptures.has(event.error);
export const blocksQueue = event => event.blocksFollowing !== false && !isTurnConflict(event) && !isInvalidCapture(event);

export function validClockState(state, company, employee) {
  return !!state && Number(state.company) === Number(company) && Number(state.employee) === Number(employee) &&
    Number.isSafeInteger(state.revision) && state.revision >= 0 && typeof state.open === 'boolean';
}
