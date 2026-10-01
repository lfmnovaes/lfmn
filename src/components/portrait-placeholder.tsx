import { UserRound } from 'lucide-react';

import { PortraitMagnet } from './portrait-magnet';

export function PortraitPlaceholder({
  label,
  note,
  badges,
}: {
  label: string;
  note: string;
  badges: string[];
}) {
  return (
    <PortraitMagnet>
      <div className="portrait-placeholder" role="img" aria-label={label}>
        <div className="portrait-rings" aria-hidden="true" />
        <span className="portrait-monogram" aria-hidden="true">
          LF
        </span>
        <UserRound className="portrait-silhouette" aria-hidden="true" strokeWidth={0.7} />
        <div className="portrait-caption" aria-hidden="true">
          <span>{label}</span>
          <small>{note}</small>
        </div>
      </div>
      <ul className="portrait-badges m-0 list-none p-0" aria-label={label}>
        {badges.map((badge, index) => (
          <li className={`badge-anchor badge-${index + 1}`} key={badge}>
            <span className="magnetic-badge">
              <span className="badge-face">{badge}</span>
            </span>
          </li>
        ))}
      </ul>
    </PortraitMagnet>
  );
}
