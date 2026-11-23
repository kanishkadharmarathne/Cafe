import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { canAccessKitchen, isActiveKitchenStatus, nextKitchenStatus } from '../src/lib/kitchenWorkflow.ts'

test('only kitchen staff and administrators can access the kitchen', () => {
  for (const role of ['kitchen', 'admin', 'super_admin']) assert.equal(canAccessKitchen(role), true)
  for (const role of ['customer', 'unknown', '', null, undefined]) assert.equal(canAccessKitchen(role), false)
})

test('new and confirmed orders can enter preparation, then become ready', () => {
  for (const type of ['Dine In', 'Takeaway', 'Pickup', 'Delivery']) {
    assert.equal(nextKitchenStatus('pending', type), 'preparing')
    assert.equal(nextKitchenStatus('confirmed', type), 'preparing')
    assert.equal(nextKitchenStatus('preparing', type), 'ready')
  }
})

test('ready delivery orders go out for delivery before completion', () => {
  assert.equal(nextKitchenStatus('ready', 'Delivery'), 'out_for_delivery')
  assert.equal(nextKitchenStatus('out_for_delivery', 'Delivery'), 'completed')
  for (const type of ['Dine In', 'Takeaway', 'Pickup']) {
    assert.equal(nextKitchenStatus('ready', type), 'completed')
    assert.equal(nextKitchenStatus('out_for_delivery', type), null)
  }
})

test('terminal and unknown statuses have no kitchen action', () => {
  for (const status of ['completed', 'cancelled', 'unknown']) {
    assert.equal(nextKitchenStatus(status, 'Delivery'), null)
  }
  assert.equal(nextKitchenStatus('ready', 'Unknown'), null)
})

test('only active orders can be cancelled or appear in the active queue', () => {
  for (const status of ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']) {
    assert.equal(isActiveKitchenStatus(status), true)
  }
  for (const status of ['completed', 'cancelled', 'unknown']) {
    assert.equal(isActiveKitchenStatus(status), false)
  }
})
