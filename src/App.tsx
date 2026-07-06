import Shell from './ui/Shell'
import PersonaPicker from './ui/PersonaPicker'
import { useApp } from './ui/store'

export default function App() {
  const needsPicker = useApp((s) => s.needsPicker)
  return needsPicker ? <PersonaPicker /> : <Shell />
}
