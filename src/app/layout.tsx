export const metadata = {
  title: 'Fleet Ledger API',
  description: 'Backend API for Fleet Ledger mobile app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
