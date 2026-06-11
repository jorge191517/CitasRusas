import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "../../../lib/supabase/server";
import { profileSchema } from "../../../lib/validation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getAuthenticatedUser(req: NextRequest) {
  // 1. Try reading from the Authorization Bearer header (very reliable for initial signups/WebViews)
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return user;
    }
  }

  // 2. Fallback to cookies (standard Next.js server components / routes)
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// GET: Fetch profile info for the logged in user
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { profile: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      role: dbUser.role,
      profile: dbUser.profile
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Register profile info
export async function POST(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let authUser = await getAuthenticatedUser(req);

    if (!isDevelopment && !authUser) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid or expired" }, { status: 401 });
    }

    const body = await req.json();
    const activeUserId = authUser?.id || body.id;
    const activeEmail = authUser?.email || body.email;

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
      // Create user and profile in database
      const dbUser = await prisma.user.upsert({
        where: { id: activeUserId },
        update: {},
        create: {
          id: activeUserId,
          email: activeEmail,
          role: "USER"
        }
      });

      const dbProfile = await prisma.profile.upsert({
        where: { userId: activeUserId },
        update: {
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
          interests: validProfile.interests,
          hobbies: validProfile.hobbies,
          lookingFor: validProfile.lookingFor,
          mainPhotoUrl: validProfile.mainPhotoUrl,
          profileCompleted: validProfile.profileCompleted,
          height: validProfile.height,
          videoIntroUrl: validProfile.videoIntroUrl,
        },
        create: {
          userId: activeUserId,
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
          interests: validProfile.interests,
          hobbies: validProfile.hobbies,
          lookingFor: validProfile.lookingFor,
          mainPhotoUrl: validProfile.mainPhotoUrl,
          profileCompleted: validProfile.profileCompleted,
          height: validProfile.height,
          videoIntroUrl: validProfile.videoIntroUrl,
        }
      });

      return NextResponse.json({ success: true, user: dbUser, profile: dbProfile });
    } catch (dbErr: any) {
      console.error("Prisma profile create error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({ success: true, mockMode: true, user: body });
      }
      return NextResponse.json({ error: `Database transaction failed: ${dbErr.message}` }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update profile fields
export async function PATCH(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let authUser = await getAuthenticatedUser(req);

    if (!isDevelopment && !authUser) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    const body = await req.json();
    const activeUserId = authUser?.id || body.id;

    if (!activeUserId) {
      return NextResponse.json({ error: "Missing user identity" }, { status: 400 });
    }

    // Validate updated Profile via Zod
    const profileValidation = profileSchema.safeParse(body.profile || body);
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
          interests: validProfile.interests,
          hobbies: validProfile.hobbies,
          lookingFor: validProfile.lookingFor,
          mainPhotoUrl: validProfile.mainPhotoUrl,
          profileCompleted: validProfile.profileCompleted,
          height: validProfile.height,
          videoIntroUrl: validProfile.videoIntroUrl,
        }
      });
      return NextResponse.json({ success: true, profile: updatedProfile });
    } catch (dbErr: any) {
      console.error("Prisma profile update error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({ success: true, mockMode: true, profile: body.profile || body });
      }
      return NextResponse.json({ error: `Database update failed: ${dbErr.message}` }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
