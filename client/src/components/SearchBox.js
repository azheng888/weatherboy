import { useEffect, useId, useRef, useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchPlaces } from '../lib/api';

const label = (p) => [p.name, p.state, p.country].filter(Boolean).join(', ');

export default function SearchBox({ onSelect, loading }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const listId = useId();

  // Press "/" anywhere to focus search.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounced, cancellable suggestions.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await searchPlaces(q, ctrl.signal);
        // The geocoder can return the same place more than once.
        const seen = new Set();
        setResults(r.filter((p) => {
          const k = label(p);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }));
        setActive(-1);
      } catch {
        /* ignore: cancelled or offline */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const choose = (place) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
    onSelect({ lat: place.lat, lon: place.lon, label: label(place) });
  };

  const submit = (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) return choose(results[active]);
    if (results.length) return choose(results[0]);
    const q = query.trim();
    if (!q) return undefined;
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    return onSelect({ q });
  };

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && results.length > 0;

  return (
    <form className="search" onSubmit={submit} role="search">
      <Search className="search__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        className="search__input"
        type="text"
        value={query}
        placeholder="Search a city"
        aria-label="Search a city"
        autoComplete="off"
        spellCheck="false"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {loading
        ? <Loader2 className="search__kbd spin" aria-label="Loading" />
        : <kbd className="search__kbd" aria-hidden="true">/</kbd>}
      <button type="submit" className="search__go" aria-label="Search">Go</button>

      {showList && (
        <ul className="search__list" id={listId} role="listbox">
          {results.map((p, i) => (
            <li
              key={`${p.lat},${p.lon}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`search__option${i === active ? ' is-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(p)}
            >
              <MapPin aria-hidden="true" />
              <span className="search__name">{p.name}</span>
              <span className="search__meta">{[p.state, p.country].filter(Boolean).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
