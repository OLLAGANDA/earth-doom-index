import Home from './routes/Home.jsx'
import LangPicker from './routes/LangPicker.jsx'
import AboutLayout from './routes/AboutLayout.jsx'
import AboutIndex from './routes/AboutIndex.jsx'
import AboutTopic from './routes/AboutTopic.jsx'

export const routes = [
  { path: '/', element: <LangPicker /> },
  { path: '/ko', element: <Home lang="ko" /> },
  { path: '/en', element: <Home lang="en" /> },
  {
    path: '/:lang/about',
    element: <AboutLayout />,
    children: [
      { index: true, element: <AboutIndex /> },
      { path: ':topic', element: <AboutTopic /> },
    ],
  },
]
