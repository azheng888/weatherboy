const OFFLINE = 'Couldn’t reach the weather service. Check your connection.';

async function getJson(url, signal) {
  let res;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    const e = new Error(err.name === 'AbortError' ? 'cancelled' : OFFLINE);
    e.cancelled = err.name === 'AbortError';
    throw e;
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || OFFLINE);
  return body;
}

/** place: { q } or { lat, lon } */
export function fetchOverview(place, signal) {
  const params = new URLSearchParams(place.q ? { q: place.q } : { lat: place.lat, lon: place.lon });
  return getJson(`/api/overview?${params}`, signal);
}

export async function searchPlaces(query, signal) {
  const data = await getJson(`/api/search/${encodeURIComponent(query)}`, signal);
  return Array.isArray(data) ? data : [];
}
