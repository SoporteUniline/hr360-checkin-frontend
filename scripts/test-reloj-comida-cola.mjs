// INC-RELOJ-COMIDA-001 (23/11/2026): la cola del reloj con rostro perdía las opciones del servidor y la pantalla
// ofrecía salida temporal/cerrar turno a empleados con cierre automático; el rechazo atoraba las siguientes checadas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syncEvents } from '../public/offline-clock/store.mjs';
import { blocksQueue } from '../public/offline-clock/turn-state.mjs';

test('la cola conserva las opciones y el mensaje que manda el servidor', async () => {
  const saved = [];
  const evento = { id: 'e1', status: 'pending', action: 'auto', captured_at: '2026-11-23T20:00:00.000Z' };
  await syncEvents([evento], async () => ({ requiereDecision: true, opciones: ['salida_comida', 'salida'], message: '¿Sales a comer o terminas tu jornada?' }), async (e) => saved.push(e));
  assert.equal(saved.at(-1).status, 'decision');
  assert.deepEqual(saved.at(-1).opciones, ['salida_comida', 'salida']);
  assert.equal(saved.at(-1).error, '¿Sales a comer o terminas tu jornada?');
});

test('una opción de salida que no aplicaba al empleado no atora las siguientes checadas', () => {
  for (const error of ['El empleado utiliza cierre automático', 'Selecciona salida temporal o cierre de turno', 'Movimiento inválido']) {
    assert.equal(blocksQueue({ status: 'review', httpStatus: 422, error }), false, error);
  }
});
