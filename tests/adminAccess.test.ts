import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { canAccessAdminTab, resolveAdminTab, type AdminTab } from '../src/app/admin/access.ts'

const tabs: AdminTab[] = ['menu-items', 'messages', 'orders', 'create-admin', 'dashboard', 'kitchen']

test('kitchen staff can only render the kitchen tab', () => {
  for (const tab of tabs) {
    assert.equal(canAccessAdminTab('kitchen', tab), tab === 'kitchen')
    assert.equal(resolveAdminTab('kitchen', tab), 'kitchen')
  }
})

test('admins retain their permissions and can access the kitchen', () => {
  for (const tab of tabs) {
    assert.equal(canAccessAdminTab('super_admin', tab), true)
    assert.equal(canAccessAdminTab('admin', tab), tab !== 'dashboard' && tab !== 'create-admin')
  }
  assert.equal(resolveAdminTab('admin', 'dashboard'), 'menu-items')
  assert.equal(resolveAdminTab('admin', 'kitchen'), 'kitchen')
})
