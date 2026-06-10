import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient } from "../../../lib/supabase/server";
import { profileSchema } from "../../../lib/validation";

// POST: Register profile info
export async function POST(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let userId = null;
    let email = null;

    if (!isDevelopment) {
      // Enforce real Supabase Auth in production
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      userId = user.id;
      email = user.email;
    }

    const body = await req.json();
    
    // Fallback ID/email parsing for dev
    const activeUserId = userId || body.id;
    const activeEmail = email || body.email;

    if (!activeUserId || !activeEmail) {
      return NextResponse.json({ error: "Missing identity credentials" }, { status: 400 });
    }

    // Validate Profile payload via Zod
    const profileValidation = profileSchema.safeParse(body.profile);
    if (!profileValidation.success) {
      return NextResponse.json({ error: profileValidation.error.format() }, { status: 400 });
    }

    const validProfile = profileValidation.data;

    try {
      const dbUser = await prisma.user.create({
        data: {
          id: activeUserId,
          email: activeEmail,
          profile: {
            create: {
              firstName: validProfile.firstName,
              lastName: validProfile.lastName,
              birthDate: new Date(validProfile.birthDate),
              gender: validProfile.gender,
              country: validProfile.country,
              city: validProfile.city,
              languages: validProfile.languages,
              profession: validProfile.profession,
              maritalStatus: validProfile.maritalStatus,
              bio: validProfile.bio,
              height: validProfile.height,
              videoIntroUrl: validProfile.videoIntroUrl,
            }
          }
        },
        include: { profile: true }
      });
      return NextResponse.json({ success: true, user: dbUser });
    } catch (dbErr: any) {
      console.log("Prisma profile create error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({ success: true, mockMode: true, user: body });
      }
      return NextResponse.json({ error: "Database transaction failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update profile fields
export async function PATCH(req: NextRequest) {
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
    }

    const body = await req.json();
    const activeUserId = userId || body.id;

    if (!activeUserId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    // Validate updated Profile via Zod
    const profileValidation = profileSchema.safeParse(body.profile);
    if (!profileValidation.success) {
      return NextResponse.json({ error: profileValidation.error.format() }, { status: 400 });
    }

    const validProfile = profileValidation.data;

    try {
      const updatedProfile = await prisma.profile.update({
        where: { userId: activeUserId },
        data: {
          firstName: validProfile.firstName,
          lastName: validProfile.lastName,
          birthDate: new Date(validProfile.birthDate),
          gender: validProfile.gender,
          country: validProfile.country,
          city: validProfile.city,
          languages: validProfile.languages,
          profession: validProfile.profession,
          maritalStatus: validProfile.maritalStatus,
          bio: validProfile.bio,
          height: validProfile.height,
          videoIntroUrl: validProfile.videoIntroUrl,
        }
      });
      return NextResponse.json({ success: true, profile: updatedProfile });
    } catch (dbErr: any) {
      console.log("Prisma profile update error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({ success: true, mockMode: true, profile: body.profile });
      }
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
