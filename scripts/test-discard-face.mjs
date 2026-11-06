import test from 'node:test';
import assert from 'node:assert/strict';
import { discardUnmatchedFace, discardReviewedEvent, syncCompanyEvents } from '../public/offline-clock/store.mjs';

test('discard reads current stored status, clears biometric evidence and never sends discarded captures', async () => {
  const records = new Map();
  globalThis.indexedDB = { open() {
    const request = {};
    queueMicrotask(() => {
      request.result = { transaction() {
        const tx = { objectStore: () => ({
          get(id) {
            const read = {};
            queueMicrotask(() => { read.result = records.get(id); read.onsuccess(); tx.oncomplete(); });
            return read;
          },
          put(event) { records.set(event.id, event); },
        }) };
        return tx;
      } };
      request.onsuccess();
    });
    return request;
  } };
  const face = { id: 'face', method: 'facial', status: 'review', errorCode: 'FACE_NOT_MATCHED', descriptor: [0.1], grant: 'secret', captured_at: '2026-11-04T12:00:00Z' };
  records.set(face.id, face);
  await discardUnmatchedFace(face.id);
  const discarded = records.get(face.id);
  assert.equal(discarded.status, 'rejected');
  assert.equal(discarded.descriptor, undefined);
  assert.equal(discarded.grant, undefined);
  assert.equal(discarded.captured_at, face.captured_at);
  assert.ok(discarded.discarded_at);
  const sent = [];
  await syncCompanyEvents([discarded], async event => sent.push(event), async () => {});
  assert.deepEqual(sent, []);
  for (const reviewed of [
    {...face, method:'codigo', code:'123', errorCode:'GPS_INACCURATE'},
    {...face, errorCode:'GPS_REFRESH_REQUIRED'},
    {...face, errorCode:'OTHER_ERROR'},
  ]) {
    records.set(face.id,reviewed);
    await discardReviewedEvent(face.id);
    const result=records.get(face.id);
    assert.equal(result.status,'rejected');
    assert.equal(result.code,undefined);assert.equal(result.descriptor,undefined);assert.equal(result.grant,undefined);
    assert.equal(result.captured_at,reviewed.captured_at);
    const sends=[];
    await syncCompanyEvents([result],async event=>sends.push(event),async()=>{});
    assert.equal(sends.length,0);
  }
  for (const protectedEvent of [
    { ...face, status: 'synced' }, { ...face, status: 'pending' },
    { ...face, status: 'decision' }, { ...face, status: 'rejected' },
  ]) {
    records.set(face.id, protectedEvent);
    await discardUnmatchedFace(face.id);
    assert.deepEqual(records.get(face.id), protectedEvent);
  }
  await discardUnmatchedFace('missing');
});
