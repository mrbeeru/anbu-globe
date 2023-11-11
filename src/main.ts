import { AnbuGlobe } from './Globe';
import './style.css';

const indicators = [
  { lat: 44.4268, lon: 26.1025, name: 'Bucharest' },
  { lat: 50.1109, lon: 8.6821, name: 'Frankfurt' },
  { lat: 50.4501, lon: 30.5234, name: 'Kyiv' },
];

const globe = new AnbuGlobe();
globe.init({ indicators });
