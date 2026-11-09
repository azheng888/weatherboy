import { render, screen, waitFor } from '@testing-library/react';
import fixture from './lib/__fixtures__/overview.json';
import App from './App';

// recharts' ResponsiveContainer needs ResizeObserver.
beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  // jsdom has no canvas; the sky scene skips particles when there's no context.
  HTMLCanvasElement.prototype.getContext = () => null;
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  global.fetch = jest.fn();
});

test('shows the landing state with search when no place is known', () => {
  render(<App />);
  expect(screen.getByRole('combobox', { name: /search a city/i })).toBeInTheDocument();
  expect(screen.getByText('Know the sky.', { selector: '.sr-only' })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('loads a place from the URL and renders the forecast', async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => fixture });
  window.history.replaceState(null, '', '/?q=London');
  render(<App />);

  await waitFor(() => expect(screen.getByText(`${fixture.weather.name} forecast & conditions`)).toBeInTheDocument());
  expect(global.fetch.mock.calls[0][0]).toBe('/api/overview?q=London');
  expect(screen.getByText('Five days, at a glance.')).toBeInTheDocument();
  expect(screen.getByText(/^(Today|Tomorrow)$/, { selector: '.week__day' })).toBeInTheDocument();
  // The URL is normalised to coordinates so it can be shared.
  expect(window.location.search).toMatch(/lat=.*lon=/);
});

test('shows a friendly error when the place is not found', async () => {
  global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'We couldn’t find that place.' }) });
  window.history.replaceState(null, '', '/?q=Nowhere');
  render(<App />);
  expect(await screen.findByText('We couldn’t find that place.')).toBeInTheDocument();
});
