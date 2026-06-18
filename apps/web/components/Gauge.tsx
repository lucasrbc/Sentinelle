import { collectedPercent, formatEuros } from '@/lib/format';

/** Jauge d'avancement d'une collecte (montants en centimes). Accessible. */
export function Gauge({
  collected,
  target,
}: {
  collected: number;
  target: number;
}): React.JSX.Element {
  const percent = collectedPercent(collected, target);

  return (
    <div className="gauge">
      <div className="gauge-amounts">
        <strong>{formatEuros(collected)}</strong>
        <span className="muted"> collectés sur {formatEuros(target)}</span>
      </div>
      <div
        className="gauge-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Avancement de la collecte : ${percent} %`}
      >
        <div className="gauge-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="gauge-percent">{percent} %</div>
    </div>
  );
}
