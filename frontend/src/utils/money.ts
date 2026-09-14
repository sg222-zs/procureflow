export function cents(value: string): bigint {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) throw new Error('金额必须是最多两位小数的非负数')
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'))
}
export function decimal(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`
}
export function total(items: { price: string; quantity: number }[]): string {
  return decimal(items.reduce((sum, item) => sum + cents(item.price) * BigInt(item.quantity), 0n))
}
export function money(value?: string): string {
  const [whole, fraction = '00'] = (value || '0.00').split('.')
  return `¥ ${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`
}
