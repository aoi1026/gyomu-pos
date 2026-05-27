'use client';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

type NomihoudaiToggleRowProps = {
  pricePerGuest: number;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

/** セット延長モーダル用：左に単価、右に飲み放題トグルボタン */
export function NomihoudaiToggleRow({
  pricePerGuest,
  enabled,
  onToggle,
  disabled,
}: NomihoudaiToggleRowProps) {
  return (
    <div className="flex items-stretch gap-2 min-w-0">
      <div className="flex shrink-0 items-center justify-end min-w-[5.5rem] sm:min-w-[6.5rem] px-2 rounded-md border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 tabular-nums">
        {formatCurrency(pricePerGuest || 0)}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'flex-1 min-w-0 h-9 text-sm font-medium transition-colors',
          enabled
            ? 'bg-pink-100 border-pink-400 text-pink-900 hover:bg-pink-200 hover:text-pink-950'
            : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-700'
        )}
      >
        飲み放題
      </Button>
    </div>
  );
}
