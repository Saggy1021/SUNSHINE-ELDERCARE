import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (secret !== 'diagnose-staging-777') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let dbHost = 'unknown'
    let dbUser = 'unknown'
    let dbPort = 'unknown'
    let dbName = 'unknown'
    
    if (process.env.DATABASE_URL) {
      try {
        const u = new URL(process.env.DATABASE_URL)
        dbHost = u.hostname
        dbUser = u.username
        dbPort = u.port
        dbName = u.pathname
      } catch (e) {
        dbHost = 'invalid-url'
      }
    }

    const currentDb = await db.$queryRaw`SELECT current_database();`
    const currentSchema = await db.$queryRaw`SELECT current_schema();`
    const tablesCheck = await db.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('CarePlan', 'AddOn', 'FaqEntry', 'WebsitePage', 'WebsiteSetting', 'Testimonial');
    `

    return NextResponse.json({
      success: true,
      environmentInfo: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
      connectionIdentity: {
        host: dbHost,
        port: dbPort,
        user: dbUser,
        database: dbName
      },
      postgresContext: {
        currentDatabase: currentDb,
        currentSchema: currentSchema
      },
      foundTables: tablesCheck,
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      // Fallback connection info safely in case DB connection fails
      connectionIdentity: {
        host: (() => { try { return new URL(process.env.DATABASE_URL || '').hostname } catch { return 'unknown' } })(),
        user: (() => { try { return new URL(process.env.DATABASE_URL || '').username } catch { return 'unknown' } })()
      }
    }, { status: 500 })
  }
}
