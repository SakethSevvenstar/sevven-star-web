import './globals.css'

export const metadata = {
  title: 'Sevven Star — Floor Management',
  description: 'Real-time stock & machine uptime tracking',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
