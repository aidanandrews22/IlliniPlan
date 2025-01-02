import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/sign-in" 
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        baseTheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? dark : undefined,
        variables: {
          colorPrimary: '#E84A27',
          colorTextOnPrimaryBackground: '#FFFFFF',
        }
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
