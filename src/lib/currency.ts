const currencyFormatter = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount)

  if (!Number.isFinite(numericAmount)) {
    throw new TypeError(`Invalid currency amount: ${amount}`)
  }

  return currencyFormatter.format(numericAmount)
}
