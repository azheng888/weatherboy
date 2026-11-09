import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock, Leaf, ArrowRight } from 'lucide-react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import Conditions from './components/Conditions';
import Week from './components/Week';
import SectionHead from './components/SectionHead';
import Footer from './components/Footer';
import useStoredState from './hooks/useStoredState';
import useReveal from './hooks/useReveal';
import { fetchOverview } from './lib/api';
import { isNightAt, placeLabel, toTemp } from './lib/weather';
import './Weather.css';

const REFRESH_MS = 10 * 60 * 1000;

const QUICK_PICKS = ['Tokyo', 'London', 'New York', 'Reykjavík', 'Cape Town', 'Sydney'];

/** Reads ?lat=&lon= or ?q= from the URL. */
function placeFromUrl() {
  const p = new URLSearchParams(window.location.search);
  if (p.has('lat') && p.has('lon')) return { lat: p.get('lat'), lon: p.get('lon') };
  if (p.get('q')) return { q: p.get('q') };
  return null;
}

function writeUrl(place) {
  const url = new URL(window.location.href);
  url.search = '';
  if (place) {
    url.searchParams.set('lat', place.lat);
    url.searchParams.set('lon', place.lon);
  }
  window.history.replaceState(null, '', url);
}

/** Older versions stored favorites as plain "City, CC" strings. */
function migrateFavorites(list) {
  return (Array.isArray(list) ? list : [])
    .map((f) => (typeof f === 'string' ? { label: f, q: f } : f))
    .filter((f) => f && f.label);
}

export default function Weather() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [unit, setUnit] = useStoredState('weatherboy-unit', 'F');
  const [lastPlace, setLastPlace] = useStoredState('weatherboy-last', null);
  const [legacyFavs] = useStoredState('weatherboy-favorites', []);
  const [favorites, setFavorites] = useStoredState('weatherboy-places', null);
  const favs = favorites ?? migrateFavorites(legacyFavs);

  const ctrlRef = useRef(null);
  const placeRef = useRef(null);

  const load = useCallback(async (place, { silent = false } = {}) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    if (!silent) setLoading(true);
    setError('');
    try {
      const result = await fetchOverview(place, ctrl.signal);
      const { lat, lon } = result.weather.coord;
      const resolved = { lat: lat.toFixed(4), lon: lon.toFixed(4) };
      placeRef.current = resolved;
      setData(result);
      setFetchedAt(Date.now());
      setLastPlace(resolved);
      writeUrl(resolved);
    } catch (err) {
      if (err.cancelled) return;
      // Keep showing the previous place, if any, alongside the error.
      setError(err.message);
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, [setLastPlace]);

  // Initial place: shared URL beats the last place viewed.
  useEffect(() => {
    const place = placeFromUrl() || lastPlace;
    if (place) load(place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clock tick for "updated x min ago" and local time.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  // Quiet background refresh while the tab is visible.
  useEffect(() => {
    if (!data) return undefined;
    const refreshIfStale = () => {
      if (document.visibilityState === 'visible' && Date.now() - fetchedAt > REFRESH_MS && placeRef.current) {
        load(placeRef.current, { silent: true });
      }
    };
    const t = setInterval(refreshIfStale, 60 * 1000);
    document.addEventListener('visibilitychange', refreshIfStale);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, [data, fetchedAt, load]);

  // Tab title + browser chrome colour follow the place.
  useEffect(() => {
    const night = data ? isNightAt(data.weather) : false;
    document.title = data
      ? `${toTemp(data.weather.main.temp, unit)}° ${data.weather.name} · WeatherBoy`
      : 'WeatherBoy · A calm read on the sky';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#121920' : '#e9e7db');
  }, [data, unit]);

  useReveal([data]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError('Location isn’t supported by this browser.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await load({ lat: coords.latitude, lon: coords.longitude });
        setLocating(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission was denied.' : 'We couldn’t determine your location.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const goHome = () => {
    ctrlRef.current?.abort();
    setData(null);
    setError('');
    setLoading(false);
    setLastPlace(null);
    placeRef.current = null;
    writeUrl(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentLabel = data ? placeLabel(data.weather) : '';
  const isFavorite = favs.some((f) => f.label === currentLabel);

  const toggleFavorite = () => {
    if (!data) return;
    const { lat, lon } = data.weather.coord;
    setFavorites(isFavorite
      ? favs.filter((f) => f.label !== currentLabel)
      : [...favs, { label: currentLabel, lat: lat.toFixed(4), lon: lon.toFixed(4) }]);
  };

  const removeFavorite = (fav) => setFavorites(favs.filter((f) => f.label !== fav.label));
  const openFavorite = (fav) => load(fav.lat ? { lat: fav.lat, lon: fav.lon } : { q: fav.q || fav.label });

  const night = data ? isNightAt(data.weather) : false;
  const nowUnix = Math.floor(now / 1000);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav
        unit={unit}
        onUnitChange={setUnit}
        onLocate={locate}
        locating={locating}
        onHome={goHome}
        hasData={!!data}
        onDark={night}
      />

      <main id="main">
        <Hero
          data={data}
          unit={unit}
          loading={loading || locating}
          error={error}
          onSelect={(place) => load(place)}
          favorites={favs}
          onOpenFavorite={openFavorite}
          onRemoveFavorite={removeFavorite}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
        />

        {data ? (
          <>
            <section id="forecast" className="section" aria-labelledby="forecast-title">
              <div className="container">
                <SectionHead id="forecast-title" eyebrow="The forecast" compact />
                <Dashboard
                  data={data}
                  unit={unit}
                  onRefresh={() => placeRef.current && load(placeRef.current, { silent: true })}
                  refreshing={loading}
                  fetchedAt={fetchedAt}
                  now={now}
                />
              </div>
            </section>

            <section id="conditions" className="section section--tight" aria-labelledby="conditions-title">
              <div className="container">
                <SectionHead id="conditions-title" eyebrow="Conditions" title="The details behind the sky." compact />
                <Conditions weather={data.weather} unit={unit} nowUnix={nowUnix} />
              </div>
            </section>

            <section id="week" className="section section--band" aria-labelledby="week-title">
              <div className="container">
                <div className="band">
                  <SectionHead id="week-title" eyebrow="The week" title="Five days, at a glance." dark compact />
                  <Week weather={data.weather} forecast={data.forecast} unit={unit} />
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="section" aria-labelledby="intro-title">
            <div className="container">
              <SectionHead id="intro-title" eyebrow="Why WeatherBoy" title="Weather rarely surprises. Timing does.">
                WeatherBoy reads the forecast, the air and the daylight as one picture, so you know
                not just what the sky will do, but when.
              </SectionHead>
              <div className="spots">
                {[
                  [Clock, 'Hour by hour', 'Temperature, feels-like and rain chance in clear 3-hour steps, in the place’s own time zone.'],
                  [Leaf, 'Air you can read', 'A plain-language air quality index with the pollutants that matter, plus what to do about it.'],
                  [CalendarDays, 'The week ahead', 'True daily highs and lows, so you can plan the trip, the run or the laundry.'],
                ].map(([Icon, title, body]) => (
                  <article key={title} className="spot spot--feature reveal">
                    <span className="spot__icon"><Icon aria-hidden="true" /></span>
                    <h3 className="spot__title font-heading">{title}</h3>
                    <p className="spot__note">{body}</p>
                  </article>
                ))}
              </div>
              <div className="quick reveal">
                <p className="small muted">Or start somewhere</p>
                <ul className="quick__list">
                  {QUICK_PICKS.map((c) => (
                    <li key={c}>
                      <button type="button" className="quick__btn" onClick={() => { load({ q: c }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        {c}<ArrowRight aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer hasData={!!data} />
    </>
  );
}
