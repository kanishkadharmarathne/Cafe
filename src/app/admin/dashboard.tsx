import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import './AdminPanel.css'

type ReportTab = 'date' | 'month' | 'year'

interface OrderRow {
  order_id: number
  order_type: string
  total_value: number | string
  order_time: string
}

interface OrderItemRow {
  item_name: string
  quantity: number | string
}


const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COLORS = ['#e8c98a', '#c8a96a', '#a8894a', '#d4a8f0', '#f0a8a8', '#a8e8c0', '#f0c8a8']

function formatCurrency(value: number | string) {
  return `₹${Number(value).toFixed(2)}`
}

function formatOrderTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

function getOrderYear(value: string) {
  return new Date(value).getFullYear()
}

function getOrderMonth(value: string) {
  return new Date(value).getMonth() + 1
}

function getOrderDate(value: string) {
  return new Date(value).getDate()
}

function getDayCount(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export default function Dashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ReportTab>('date')
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1))
  const [selectedDate, setSelectedDate] = useState(String(new Date().getDate()))
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('order_id, order_type, total_value, order_time')
        .order('order_time', { ascending: false })

      if (!error && data) {
        setOrders(data as OrderRow[])
      }

      setLoading(false)
    }

    void fetchOrders()
  }, [])

  useEffect(() => {
    async function fetchOrderItems() {
      setItemsLoading(true)
      const { data, error } = await supabase
        .from('order_items')
        .select('item_name, quantity')

      if (!error && data) {
        setOrderItems(data as OrderItemRow[])
      }

      setItemsLoading(false)
    }

    void fetchOrderItems()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [activeTab, selectedYear, selectedMonth, selectedDate])

  useEffect(() => {
    if (!orders.length) {
      return
    }

    const years = Array.from(new Set(orders.map((order) => getOrderYear(order.order_time))))
    if (!years.includes(Number(selectedYear))) {
      setSelectedYear(String(years[0]))
    }
  }, [orders, selectedYear])

  const years = Array.from(new Set(orders.map((order) => getOrderYear(order.order_time)))).sort((a, b) => a - b)
  const monthOptions = MONTH_NAMES.map((label, index) => ({ label, value: String(index + 1) }))

  const yearFilteredOrders = orders.filter((order) => {
    if (!selectedYear) {
      return true
    }

    return getOrderYear(order.order_time).toString() === selectedYear
  })

  const monthFilteredOrders = yearFilteredOrders.filter((order) => {
    if (!selectedMonth) {
      return true
    }

    return getOrderMonth(order.order_time).toString() === selectedMonth
  })

  const dateFilteredOrders = activeTab === 'date'
    ? monthFilteredOrders.filter((order) => {
      if (!selectedDate) {
        return true
      }

      return getOrderDate(order.order_time).toString() === selectedDate
    })
    : monthFilteredOrders

  const filteredOrders = dateFilteredOrders
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const visibleRows = filteredOrders.slice((page - 1) * pageSize, page * pageSize)
  const pageTotal = visibleRows.reduce((sum, order) => sum + Number(order.total_value), 0)
  const grandTotal = filteredOrders.reduce((sum, order) => sum + Number(order.total_value), 0)

  const availableDates = Array.from(
    new Set(monthFilteredOrders.map((order) => getOrderDate(order.order_time)))
  ).sort((a, b) => a - b)

  const chartData = (() => {
    if (activeTab === 'date') {
      const buckets = Array.from({ length: 24 }, (_, index) => ({ name: `${String(index).padStart(2, '0')}:00`, quantity: 0 }))
      filteredOrders.forEach((order) => {
        const hour = new Date(order.order_time).getHours()
        buckets[hour].quantity += 1
      })
      return buckets
    }

    if (activeTab === 'month') {
      const daysInMonth = getDayCount(Number(selectedYear), Number(selectedMonth))
      const buckets = Array.from({ length: daysInMonth }, (_, index) => ({ name: String(index + 1), quantity: 0 }))
      filteredOrders.forEach((order) => {
        const day = getOrderDate(order.order_time)
        if (day <= buckets.length) {
          buckets[day - 1].quantity += 1
        }
      })
      return buckets
    }

    const buckets = MONTH_NAMES.map((name) => ({ name, quantity: 0 }))
    filteredOrders.forEach((order) => {
      const monthIndex = getOrderMonth(order.order_time) - 1
      if (monthIndex >= 0 && monthIndex < buckets.length) {
        buckets[monthIndex].quantity += 1
      }
    })
    return buckets
  })()

  const itemChartData = Array.from(
    orderItems.reduce((map, item) => {
      const current = map.get(item.item_name) ?? 0
      map.set(item.item_name, current + Number(item.quantity))
      return map
    }, new Map<string, number>())
  )
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)

  const orderTypePieData = orders.reduce(
    (acc, order) => {
      const normalized = order.order_type.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()
      if (normalized.includes('take')) {
        acc[0].value += 1
      } else if (normalized.includes('home') || normalized.includes('delivery') || normalized.includes('delivary')) {
        acc[1].value += 1
      }
      return acc
    },
    [
      { name: 'Take Away', value: 0 },
      { name: 'Home Delivery', value: 0 },
    ]
  )

  return (
    <div className="dashboard-page">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Dashboard</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="dashboard-chart-card">
          <h3 className="dashboard-chart-title">Item Quantity Report</h3>

          {itemsLoading ? (
            <div className="loading">Loading…</div>
          ) : itemChartData.length === 0 ? (
            <div className="empty">No order item data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={itemChartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                <XAxis dataKey="name" tick={{ fill: '#a08060', fontSize: 12 }} interval={0} />
                <YAxis tick={{ fill: '#a08060', fontSize: 12 }} allowDecimals={false} width={36} />
                <Tooltip
                  contentStyle={{ background: '#ad603c', border: '1px solid #5a3a1a', color: '#e8c98a', borderRadius: 8 }}
                  cursor={{ fill: 'rgba(232,201,138,.08)' }}
                />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                  {itemChartData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-chart-card">
          <h3 className="dashboard-chart-title">Order Type Split</h3>

          {loading ? (
            <div className="loading">Loading…</div>
          ) : orderTypePieData.every((item) => item.value === 0) ? (
            <div className="empty">No order type data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={orderTypePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {orderTypePieData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#ad603c', border: '1px solid #5a3a1a', color: '#e8c98a', borderRadius: 8 }}
                  cursor={{ fill: 'rgba(232,201,138,.08)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard reports">
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === 'date' ? 'active' : ''}`}
          onClick={() => setActiveTab('date')}
        >
          Date Wise
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === 'month' ? 'active' : ''}`}
          onClick={() => setActiveTab('month')}
        >
          Month Wise
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${activeTab === 'year' ? 'active' : ''}`}
          onClick={() => setActiveTab('year')}
        >
          Year Wise
        </button>
      </div>

      <div className="dashboard-filter-card">
        <div className="dashboard-filter-row">
          <label className="dashboard-filter-field">
            <span>Year</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          {activeTab !== 'year' && (
            <label className="dashboard-filter-field">
              <span>Month</span>
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>
          )}

          {activeTab === 'date' && (
            <label className="dashboard-filter-field">
              <span>Date</span>
              <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
                {availableDates.length === 0 ? (
                  <option value="">No dates</option>
                ) : (
                  Array.from({ length: getDayCount(Number(selectedYear), Number(selectedMonth)) }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))
                )}
              </select>
            </label>
          )}
        </div>

        <div className="dashboard-summary-bar">
          <span>{filteredOrders.length} orders</span>
          <span>Page total: {formatCurrency(pageTotal)}</span>
          <span>Grand total: {formatCurrency(grandTotal)}</span>
        </div>
      </div>

      <div className="dashboard-chart-card">
        <h3 className="dashboard-chart-title">
          {activeTab === 'date' ? 'Orders by Hour' : activeTab === 'month' ? 'Orders by Day' : 'Orders by Month'}
        </h3>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty">No order data for the selected filters.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
              <XAxis dataKey="name" tick={{ fill: '#a08060', fontSize: 12 }} interval={0} />
              <YAxis tick={{ fill: '#a08060', fontSize: 12 }} allowDecimals={false} width={36} />
              <Tooltip
                contentStyle={{ background: '#ad603c', border: '1px solid #5a3a1a', color: '#e8c98a', borderRadius: 8 }}
                cursor={{ fill: 'rgba(232,201,138,.08)' }}
              />
              <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="dashboard-chart-card">
        <div className="dashboard-table-head">
          <h3 className="dashboard-chart-title">Orders Report</h3>
          <div className="dashboard-pagination">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
              ←
            </button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page === pageCount}>
              →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty">No order data for the selected filters.</div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Order Type</th>
                    <th>Total</th>
                    <th>Order Time</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((order) => (
                    <tr key={order.order_id}>
                      <td>#{order.order_id}</td>
                      <td>{order.order_type}</td>
                      <td>{formatCurrency(order.total_value)}</td>
                      <td>{formatOrderTime(order.order_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dashboard-table-footer">
              <span>Current page total: {formatCurrency(pageTotal)}</span>
              <span>Grand total: {formatCurrency(grandTotal)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
