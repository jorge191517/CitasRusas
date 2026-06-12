import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // If no user, maybe we can still show profiles but blur them? Or just return all profiles.
    // The user wants all profiles to show up so let's just fetch all completed profiles.
    // If logged in, exclude current user.
    const currentUserId = user?.id;

    // Fetch all profiles that are completed
    let whereClause: any = {
      profileCompleted: true
    };

    if (currentUserId) {
      whereClause.userId = { not: currentUserId };
    }

    const dbProfiles = await prisma.profile.findMany({
      where: whereClause,
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const discoverProfiles = dbProfiles.map(p => {
      const age = p.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() : 25;
      return {
        id: p.userId, // use userId because swipes are based on User ID
        firstName: p.firstName,
        lastName: p.lastName,
        age: age,
        gender: p.gender,
        country: p.country,
        city: p.city,
        languages: p.languages || [],
        profession: p.profession,
        maritalStatus: p.maritalStatus,
        bio: p.bio,
        interests: p.interests || [],
        height: p.height,
        imageUrl: p.mainPhotoUrl || "",
        verified: p.verifiedStatus === "VERIFIED",
        lookingFor: p.lookingFor,
      };
    });

    return NextResponse.json({
      success: true,
      profiles: discoverProfiles,
    });
  } catch (err: any) {
    console.error("[GET DISCOVER] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
