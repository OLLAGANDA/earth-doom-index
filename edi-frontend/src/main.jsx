import { ViteReactSSG } from 'vite-react-ssg'
import 'nes.css/css/nes.min.css'
import './index.css'
import { routes } from './routes.jsx'

export const createRoot = ViteReactSSG({ routes })
