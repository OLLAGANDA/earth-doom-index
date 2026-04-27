import Home from './routes/Home.jsx'
import LangPicker from './routes/LangPicker.jsx'

export const routes = [
  { path: '/', element: <LangPicker /> },
  { path: '/ko', element: <Home lang="ko" /> },
  { path: '/en', element: <Home lang="en" /> },
]
