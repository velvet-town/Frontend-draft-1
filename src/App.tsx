import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from './contexts/AuthContext'
import Home from './Webpages/Home'
import Game from './components/Game'

// Create the root route
const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
})

// Create the home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

// Create the game route
const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game',
  component: Game,
})

// Create the router
const routeTree = rootRoute.addChildren([homeRoute, gameRoute])
const router = createRouter({ routeTree })

// Register the router type
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
