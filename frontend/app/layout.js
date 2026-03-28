import './globals.css'
import AuthGuard from "@/components/AuthGuard";

export const metadata = {
  title: 'SmartWatch Pro — Enterprise Control',
  description: 'Sistema empresarial de gestión y monitoreo de smartwatches GPS',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    blue: { DEFAULT: '#3b82f6', 600: '#2563eb' },
                    green: { DEFAULT: '#22c55e' },
                    orange: { DEFAULT: '#f97316' },
                    red: { DEFAULT: '#ef4444' },
                  }
                }
              }
            };
          `
        }} />
      </head>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  )
}
