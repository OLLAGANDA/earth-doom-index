import { ViteReactSSG } from 'vite-react-ssg'
import 'nes.css/css/nes.min.css'
import './index.css'
import { routes } from './routes.jsx'

const TOPICS = ['society', 'climate', 'economy', 'solar', 'methodology']
const LANGS = ['ko', 'en']

export const includedRoutes = () => [
  '/',
  ...LANGS.map(l => `/${l}`),
  ...LANGS.map(l => `/${l}/about`),
  ...LANGS.flatMap(l => TOPICS.map(t => `/${l}/about/${t}`)),
]

export const createRoot = ViteReactSSG({ routes })
