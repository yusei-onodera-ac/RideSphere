import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservation, drivers, isEligibleDriver, rankDrivers } from '../public/src/dispatch.js';

test('filters drivers by dispatch eligibility rules', () => {
  const eligible = drivers.filter(isEligibleDriver).map((driver) => driver.id);

  assert.deepEqual(eligible, ['drv-001', 'drv-002']);
});

test('ranks available drivers by distance and ETA score', () => {
  const ranked = rankDrivers(drivers);

  assert.equal(ranked[0].id, 'drv-001');
  assert.ok(ranked[0].score < ranked[1].score);
});

test('creates a reservation from submitted form fields', () => {
  const formData = new FormData();
  formData.set('customerName', '佐藤 花子');
  formData.set('pickup', '東京駅');
  formData.set('destination', '羽田空港');
  formData.set('pickupTime', '14:30');

  const reservation = createReservation(formData);

  assert.match(reservation.id, /^RS-\d+$/);
  assert.equal(reservation.customerName, '佐藤 花子');
  assert.equal(reservation.status, '候補検索済み');
});
