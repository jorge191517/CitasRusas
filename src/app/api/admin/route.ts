import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";

// GET: Fetch administrator reports & verification stats
export async function GET(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let userId = null;

    if (!isDevelopment) {
      // Enforce real Supabase Auth in production
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      userId = user.id;

      // Check User Role from Prisma
      const dbUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!dbUser || dbUser.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
      }
    }

    try {
      const userCount = await prisma.user.count();
      const activeCount = await prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 86400000) } }
      });
      const reportsCount = await prisma.report.count({
        where: { status: "PENDING" }
      });

      return NextResponse.json({
        success: true,
        stats: {
          registeredUsers: userCount,
          activeUsers: activeCount,
          pendingReports: reportsCount
        }
      });
    } catch (dbErr: any) {
      console.log("Prisma admin statistics database error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({
          success: true,
          mockMode: true,
          stats: {
            registeredUsers: 1248,
            activeUsers: 342,
            pendingReports: 2
          }
        });
      }
      return NextResponse.json({ error: "Database statistics lookup failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
