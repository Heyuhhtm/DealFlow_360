/**
 * Currency and Number Formatters for DealFlow360 (Indian Rupee / INR)
 */
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export const formatINR = (
  amount: number | string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '₹0.00';
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  })}`;
};
