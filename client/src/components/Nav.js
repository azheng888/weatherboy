import { useEffect, useState } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import Logo from './Logo';

const LINKS = [
  ['Forecast', '#forecast'],
  ['Conditions', '#conditions'],
  ['Week', '#week'],
];

export default function Nav({ unit, onUnitChange, onLocate, locating, onHome, hasData, onDark }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}${onDark && !scrolled ? ' nav--on-dark' : ''}`}>
      <div className="nav__inner">
        <button type="button" className="nav__brand" onClick={onHome} aria-label="WeatherBoy home">
          <Logo className="nav__logo" />
          <span className="font-heading">WeatherBoy</span>
        </button>

        {hasData && (
          <ul className="nav__links">
            {LINKS.map(([label, href]) => (
              <li key={href}><a className="nav__link" href={href}>{label}</a></li>
            ))}
          </ul>
        )}
        <span className="nav__rule" aria-hidden="true" />

        <div className="nav__actions">
          <div className="seg seg--sm" role="group" aria-label="Temperature unit">
            {['F', 'C'].map((u) => (
              <button
                key={u}
                type="button"
                className={`seg__btn${unit === u ? ' is-active' : ''}`}
                aria-pressed={unit === u}
                onClick={() => onUnitChange(u)}
              >
                °{u}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary" onClick={onLocate} disabled={locating}>
            {locating ? <Loader2 className="spin" aria-hidden="true" /> : <LocateFixed aria-hidden="true" />}
            <span className="nav__locate-label">Use my location</span>
          </button>
        </div>
      </div>
    </header>
  );
}
