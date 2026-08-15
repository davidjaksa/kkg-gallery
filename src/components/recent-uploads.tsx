export function StorageMeter({ percent, usedLabel }: { percent: number; usedLabel: string }) {
  return (
    <div className="mt-6 pt-4 border-t border-outline-variant">
      <div className="flex justify-between items-center text-sm">
        <span className="text-secondary font-label-sm uppercase">Felhasznált Tárhely</span>
        <span className="text-on-surface font-bold">{percent}%</span>
      </div>
      <div className="w-full bg-surface-container mt-2 rounded-full h-2">
        <div className="bg-primary h-2 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 font-label-sm text-label-sm text-secondary">{usedLabel}</p>
    </div>
  );
}
