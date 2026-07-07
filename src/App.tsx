import Shell from './ui/Shell'
import Landing from './ui/landing/Landing'
import Access from './ui/landing/Access'
import { useApp } from './ui/store'

/**
 * Addendum F §4: the landing site is the public face; the app behind the
 * login is the product. No session → landing routes only; /app is gated.
 */
export default function App() {
  const route = useApp((s) => s.route)
  const session = useApp((s) => s.session)

  if (route === 'app' && session) return <Shell />
  if (route === 'access' || (route === 'app' && !session)) {
    return (
      <Landing section="access">
        <Access />
      </Landing>
    )
  }
  return <Landing section={route} />
}
