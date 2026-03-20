interface CurrencyDisplayProps {
  amount: number | string;
}

export default function CurrencyDisplay({ amount }: CurrencyDisplayProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return <span>₾{formatted}</span>;
}
