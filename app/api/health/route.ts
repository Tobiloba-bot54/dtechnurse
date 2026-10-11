// File: DTECHNURSE-SITE-main/app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', app: 'dtechnurse', checks: { database: 'not_probed', auth: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'not_configured' } }, { headers: { 'Cache-Control': 'no-store' } });
}
