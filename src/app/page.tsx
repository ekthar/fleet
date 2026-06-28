export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Fleet Ledger API</h1>
      <p>Backend is running. Use the mobile app or API endpoints directly.</p>
      <h2>Endpoints</h2>
      <ul>
        <li><code>POST /api/auth/login</code></li>
        <li><code>GET/POST /api/vehicles</code></li>
        <li><code>GET/PUT/DELETE /api/vehicles/:id</code></li>
        <li><code>GET/POST /api/employees</code></li>
        <li><code>GET/PUT/DELETE /api/employees/:id</code></li>
        <li><code>GET/POST /api/entries</code></li>
        <li><code>GET/PUT/DELETE /api/entries/:id</code></li>
        <li><code>GET /api/dashboard/summary?range=</code></li>
        <li><code>GET /api/reports/salary-summary?range=</code></li>
        <li><code>GET /api/reports/vehicle-pnl?range=</code></li>
      </ul>
    </main>
  );
}
