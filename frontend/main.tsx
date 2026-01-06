import '@/assets/css/Fonts.css'
import '@/assets/css/index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import routes from '~react-pages'

const queryClient = new QueryClient()
const router = createBrowserRouter(routes as any)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoaderCircle />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
)
