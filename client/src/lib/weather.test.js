import fixture from './__fixtures__/overview.json';
import {
  toTemp, toWind, dewPoint, compass, dailySummary, slotsForRange, localDayKey,
  formatClock, conditionGroup, suggestions, outlookSentence, daylightProgress,
} from './weather';

const { weather, forecast } = fixture;
const tz = weather.timezone;

test('unit conversions', () => {
  expect(toTemp(0, 'F')).toBe(32);
  expect(toTemp(100, 'F')).toBe(212);
  expect(toTemp(21.6, 'C')).toBe(22);
  expect(toWind(10, 'F')).toBe(22);
  expect(toWind(10, 'C')).toBe(36);
  expect(Math.round(dewPoint(20, 50))).toBe(9);
  expect(compass(0)).toBe('N');
  expect(compass(225)).toBe('SW');
  expect(compass(359)).toBe('N');
});

test('times are formatted in the place timezone, not the browser', () => {
  // 2024-01-01T00:00:00Z shown in UTC+9 is 9:00 AM.
  expect(formatClock(1704067200, 9 * 3600)).toBe('9:00 AM');
  expect(formatClock(1704067200, -5 * 3600)).toBe('7:00 PM');
});

test('condition groups', () => {
  expect(conditionGroup(211)).toBe('storm');
  expect(conditionGroup(500)).toBe('rain');
  expect(conditionGroup(800)).toBe('clear');
  expect(conditionGroup(801)).toBe('partly');
  expect(conditionGroup(804)).toBe('cloudy');
});

test('daily summary uses true highs and lows across all slots of a local day', () => {
  const days = dailySummary(forecast, tz);
  expect(days.length).toBeGreaterThanOrEqual(5);
  const total = days.reduce((n, d) => n + d.slots, 0);
  expect(total).toBe(forecast.list.length);
  days.forEach((d) => {
    const slots = forecast.list.filter((s) => localDayKey(s.dt, tz) === d.key);
    expect(d.high).toBe(Math.max(...slots.map((s) => s.main.temp_max)));
    expect(d.low).toBe(Math.min(...slots.map((s) => s.main.temp_min)));
    expect(d.high).toBeGreaterThanOrEqual(d.low);
  });
});

test('range slots', () => {
  expect(slotsForRange(forecast, tz, '24h', weather.dt)).toHaveLength(9);
  expect(slotsForRange(forecast, tz, '5d', weather.dt)).toHaveLength(forecast.list.length);
  const tomorrow = slotsForRange(forecast, tz, 'tomorrow', weather.dt);
  const key = localDayKey(weather.dt + 86400, tz);
  tomorrow.forEach((s) => expect(localDayKey(s.dt, tz)).toBe(key));
});

test('suggestions and outlook always produce something useful', () => {
  const tips = suggestions({ weather, forecast, aqi: fixture.aqi, unit: 'F' });
  expect(tips.length).toBeGreaterThan(0);
  expect(tips.length).toBeLessThanOrEqual(3);
  expect(outlookSentence(weather, forecast)).toMatch(/\.$/);
  const t = daylightProgress(weather);
  expect(t).toBeGreaterThanOrEqual(0);
  expect(t).toBeLessThanOrEqual(1);
});

test('rainy forecast suggests an umbrella', () => {
  const wet = { ...forecast, list: forecast.list.map((s, i) => (i === 1 ? { ...s, pop: 0.8 } : { ...s, pop: 0 })) };
  const tips = suggestions({ weather, forecast: wet, aqi: null, unit: 'C' });
  expect(tips[0].kind).toBe('umbrella');
  expect(tips[0].detail).toMatch(/80%/);
});
