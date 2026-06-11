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

    // Reject blob URLs
    if (validProfile.mainPhotoUrl && validProfile.mainPhotoUrl.startsWith("blob:")) {
      return NextResponse.json({ error: "La URL de la foto de perfil no puede ser una URL de tipo blob local." }, { status: 400 });
    }

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

    // Validate updated Profile via Zod partial schema
    const profileValidation = profileSchema.partial().safeParse(body.profile || body);
    if (!profileValidation.success) {
      return NextResponse.json({ error: profileValidation.error.format() }, { status: 400 });
    }

    const validProfile = profileValidation.data;

    // Reject blob URLs
    if (validProfile.mainPhotoUrl && validProfile.mainPhotoUrl.startsWith("blob:")) {
      return NextResponse.json({ error: "La URL de la foto de perfil no puede ser una URL de tipo blob local." }, { status: 400 });
    }

    try {
      const activeEmail = authUser?.email || body.email || "";

      // ── Step 1: Resolve the canonical userId for the Profile ──────────────
      // Priority: Supabase Auth ID > existing User by email
      let resolvedUserId = activeUserId;

      // Check if User already exists by Supabase ID
      const userById = await prisma.user.findUnique({ where: { id: activeUserId } });

      if (!userById) {
        // User doesn't exist by Supabase ID — check by email
        const userByEmail = await prisma.user.findUnique({ where: { email: activeEmail } });

        if (userByEmail) {
          // A User with this email exists but with a different ID.
          // Use that user's ID for the profile (the profile is tied to the DB user).
          resolvedUserId = userByEmail.id;
          console.warn(`User ID mismatch: Supabase=${activeUserId}, DB=${userByEmail.id}. Using DB id for profile.`);
        } else {
          // No user found at all — create one with the Supabase ID
          await prisma.user.create({
            data: {
              id: activeUserId,
              email: activeEmail,
              role: "USER",
            },
          });
        }
      }
      // If userById exists, resolvedUserId is already correct

      // ── Step 2: Upsert Profile using resolvedUserId ───────────────────────
      const updatedProfile = await prisma.profile.upsert({
        where: { userId: resolvedUserId },
        update: {
          ...(validProfile.firstName !== undefined && { firstName: validProfile.firstName }),
          ...(validProfile.lastName !== undefined && { lastName: validProfile.lastName }),
          ...(validProfile.birthDate !== undefined && { birthDate: new Date(validProfile.birthDate) }),
          ...(validProfile.gender !== undefined && { gender: validProfile.gender }),
          ...(validProfile.country !== undefined && { country: validProfile.country }),
          ...(validProfile.city !== undefined && { city: validProfile.city }),
          ...(validProfile.languages !== undefined && { languages: validProfile.languages }),
          ...(validProfile.profession !== undefined && { profession: validProfile.profession }),
          ...(validProfile.maritalStatus !== undefined && { maritalStatus: validProfile.maritalStatus }),
          ...(validProfile.bio !== undefined && { bio: validProfile.bio }),
          ...(validProfile.interests !== undefined && { interests: validProfile.interests }),
          ...(validProfile.hobbies !== undefined && { hobbies: validProfile.hobbies }),
          ...(validProfile.lookingFor !== undefined && { lookingFor: validProfile.lookingFor }),
          ...(validProfile.mainPhotoUrl !== undefined && { mainPhotoUrl: validProfile.mainPhotoUrl }),
          ...(validProfile.profileCompleted !== undefined && { profileCompleted: validProfile.profileCompleted }),
          ...(validProfile.height !== undefined && { height: validProfile.height }),
          ...(validProfile.videoIntroUrl !== undefined && { videoIntroUrl: validProfile.videoIntroUrl }),
        },
        create: {
          userId: resolvedUserId,
          // Required fields — use provided values or safe defaults
          firstName: validProfile.firstName || "",
          lastName: validProfile.lastName || "",
          birthDate: validProfile.birthDate ? new Date(validProfile.birthDate) : new Date("2000-01-01"),
          gender: validProfile.gender || "OTHER",
          country: validProfile.country || "",
          city: validProfile.city || "",
          languages: validProfile.languages || [],
          interests: validProfile.interests || [],
          hobbies: validProfile.hobbies || [],
          // Optional fields
          profession: validProfile.profession,
          maritalStatus: validProfile.maritalStatus,
          bio: validProfile.bio,
          lookingFor: validProfile.lookingFor,
          mainPhotoUrl: validProfile.mainPhotoUrl,
          profileCompleted: validProfile.profileCompleted ?? false,
          height: validProfile.height,
          videoIntroUrl: validProfile.videoIntroUrl,
        },
      });
      return NextResponse.json({ success: true, profile: updatedProfile });
    } catch (dbErr: any) {
      console.error("Prisma profile upsert error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({ success: true, mockMode: true, profile: body.profile || body });
      }
      return NextResponse.json({ error: `Database update failed: ${dbErr.message}` }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
