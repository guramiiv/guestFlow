import { useTranslation } from 'react-i18next';

const statusStyles: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-600';
  const label = t(`bookings.status.${status}`, status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
