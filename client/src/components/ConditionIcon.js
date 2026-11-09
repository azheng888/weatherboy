import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudDrizzle, CloudRain,
  CloudLightning, CloudSnow, CloudFog,
} from 'lucide-react';
import { conditionGroup } from '../lib/weather';

const ICONS = {
  storm: [CloudLightning, CloudLightning],
  drizzle: [CloudDrizzle, CloudDrizzle],
  rain: [CloudRain, CloudRain],
  snow: [CloudSnow, CloudSnow],
  fog: [CloudFog, CloudFog],
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
};

export default function ConditionIcon({ id, night = false, className = '', label }) {
  const Icon = ICONS[conditionGroup(id)][night ? 1 : 0];
  return (
    <Icon
      className={`cond-icon cond-icon--${conditionGroup(id)} ${className}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      strokeWidth={1.75}
    />
  );
}
