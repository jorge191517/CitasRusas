import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";

// POST: Report a user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    const body = await req.json();
    const { reportedUserId, reason, details } = body;

    if (!reportedUserId || !reason) {
      return NextResponse.json({ error: "Missing reportedUserId or reason" }, { status: 400 });
    }

    if (reportedUserId === user.id) {
      return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
    }

    // Check if reported user exists
    // If it starts with mock-, ensure shadow user exists
    if (reportedUserId.startsWith("mock-")) {
      const mockProf = (await import("../../../lib/mockData")).mockProfiles.find(p => p.id === reportedUserId);
      await prisma.user.upsert({
        where: { id: reportedUserId },
        update: {},
        create: {
          id: reportedUserId,
          email: `${reportedUserId}@veloura.mock`,
          role: "USER",
          profile: {
            create: {
              firstName: mockProf?.firstName || "Mock",
              lastName: mockProf?.lastName || "Profile",
              birthDate: new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000),
              gender: (mockProf?.gender as any) || "FEMALE",
              country: mockProf?.country || "España",
              city: mockProf?.city || "Madrid",
              mainPhotoUrl: mockProf?.imageUrl || "",
              profileCompleted: true
            }
          }
        }
      });
    }

    // Create Report record
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId,
        reason,
        details: details || null,
        status: "PENDING"
      }
    });

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    console.error("[REPORT API] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
