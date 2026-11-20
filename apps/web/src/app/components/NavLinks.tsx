import { Link } from '@tanstack/react-router';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', exact: true },
  { to: '/calendar', label: 'Calendar', exact: false },
  { to: '/trends', label: 'Trends', exact: false },
  { to: '/power-curve', label: 'Power Curve', exact: false },
  { to: '/records', label: 'Records', exact: false },
  { to: '/review', label: 'Year in review', exact: false },
  { to: '/climbs', label: 'Climbs', exact: false },
  { to: '/heatmap', label: 'Heatmap', exact: false },
  { to: '/activities', label: 'Activities', exact: false },
  { to: '/gear', label: 'Gear', exact: false },
  { to: '/settings', label: 'Settings', exact: false },
] as const;

type NavLinksProps = {
  /** Vertical in the desktop sidebar, horizontal in the mobile header. */
  orientation: 'vertical' | 'horizontal';
};

/** The main navigation links; the current page is highlighted. */
export const NavLinks = ({ orientation }: NavLinksProps) => {
  const layoutClass =
    orientation === 'vertical'
      ? 'flex items-center justify-between rounded-lg px-3 py-2 text-sm'
      : 'shrink-0 rounded-lg px-3 py-1.5 text-sm';

  return (
    <>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className={`${layoutClass} text-ink-2 hover:bg-surface-0 hover:text-ink`}
          activeProps={{ className: 'bg-surface-0 font-semibold text-ink' }}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
};
