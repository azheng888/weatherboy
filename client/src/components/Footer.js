import Logo from './Logo';

export default function Footer({ hasData }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">
              <Logo className="footer__logo" />
              <span className="font-heading">WeatherBoy</span>
            </div>
            <p className="footer__tag">A calm read on the sky, for anywhere you’re headed.</p>
          </div>
          {hasData && (
            <div>
              <h2 className="footer__h">Explore</h2>
              <ul className="footer__links">
                <li><a href="#forecast">Forecast</a></li>
                <li><a href="#conditions">Conditions</a></li>
                <li><a href="#week">The week</a></li>
              </ul>
            </div>
          )}
          <div>
            <h2 className="footer__h">Shortcuts</h2>
            <ul className="footer__links">
              <li><kbd>/</kbd> Search a city</li>
              <li>Star a place to save it</li>
              <li>Share the URL to share a place</li>
            </ul>
          </div>
          <div>
            <h2 className="footer__h">Data</h2>
            <ul className="footer__links">
              <li><a href="https://openweathermap.org/" target="_blank" rel="noreferrer">OpenWeather</a></li>
              <li>Refreshed every 10 minutes</li>
            </ul>
          </div>
        </div>
        <div className="footer__base">
          <p>© {new Date().getFullYear()} WeatherBoy. All rights reserved.</p>
          <p>Built for calmer plans.</p>
        </div>
      </div>
      <div className="footer__word font-heading" aria-hidden="true">WeatherBoy</div>
    </footer>
  );
}
