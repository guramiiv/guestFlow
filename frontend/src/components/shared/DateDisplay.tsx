import { format, parseISO } from 'date-fns';

interface DateDisplayProps {
  date: string;
}

export default function DateDisplay({ date }: DateDisplayProps) {
  const parsed = parseISO(date);
  return <span>{format(parsed, 'dd.MM.yyyy')}</span>;
}
