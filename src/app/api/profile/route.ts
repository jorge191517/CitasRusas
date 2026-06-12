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
      include: { 
        profile: true,
        photos: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!dbUser) {
      // User exists in Supabase Auth but not yet in our DB (registered but never completed onboarding)
      // Return null profile with profileCompleted=false — do NOT return 404
      // This prevents the dashboard from treating a missing DB row as an error
      return NextResponse.json({
        success: true,
        role: "USER",
        profile: null,
        subscription: null,
        likesCount: 0,
        likesReceivedCount: 0,
        blockedUserIds: []
      });
    }

    // All photos with full metadata (client will resolve main vs gallery)
    const allPhotos = dbUser.photos.map(p => ({
      id: p.id,
      url: p.url,
      isPrimary: p.isPrimary,
      createdAt: p.createdAt,
    }));

    // Legacy: gallery photos as URL array (non-primary)
    const galleryPhotos = dbUser.photos.filter(p => !p.isPrimary).map(p => p.url);

    // Resolve mainPhotoUrl fallback:
    // 1. Profile.mainPhotoUrl
    // 2. First isPrimary Photo
    // 3. First Photo of any kind
    let resolvedMainPhotoUrl = dbUser.profile?.mainPhotoUrl || null;
    if (!resolvedMainPhotoUrl) {
      const primaryPhoto = dbUser.photos.find(p => p.isPrimary);
      if (primaryPhoto) resolvedMainPhotoUrl = primaryPhoto.url;
      else if (dbUser.photos.length > 0) resolvedMainPhotoUrl = dbUser.photos[0].url;
    }

    // Fetch subscription details
    const userSub = await prisma.subscription.findUnique({
      where: { userId: authUser.id }
    });

    // Fetch total likes count sent by the user (for VIP limit tracking)
    const likesCount = await prisma.like.count({
      where: {
        senderId: authUser.id,
        type: { in: ["LIKE", "SUPER_LIKE"] }
      }
    });

    // Fetch likes received by this user (for profile metrics)
    const likesReceivedCount = await prisma.like.count({
      where: {
        receiverId: authUser.id,
        type: { in: ["LIKE", "SUPER_LIKE"] }
      }
    });

    // Fetch blocked users list
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: authUser.id },
          { blockedId: authUser.id }
        ]
      }
    });
    const blockedUserIds = blocks.map(b => b.blockerId === authUser.id ? b.blockedId : b.blockerId);

    return NextResponse.json({
      success: true,
      role: dbUser.role,
      profile: dbUser.profile ? {
        ...dbUser.profile,
        mainPhotoUrl: resolvedMainPhotoUrl,  // guaranteed fallback chain
        allPhotos,                            // full objects: id, url, isPrimary, createdAt
        photos: galleryPhotos                 // legacy: string[] of non-primary URLs
      } : null,
      subscription: userSub,
      likesCount,
      likesReceivedCount,
      blockedUserIds
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

    // Combine mainPhotoUrl and any photos array
    const allPhotoUrls: string[] = [];
    if (validProfile.mainPhotoUrl) {
      allPhotoUrls.push(validProfile.mainPhotoUrl);
    }
    if (validProfile.photos && Array.isArray(validProfile.photos)) {
      validProfile.photos.forEach((url: string) => {
        if (url && !allPhotoUrls.includes(url)) {
          allPhotoUrls.push(url);
        }
      });
    }

    // Reject blob URLs and non-http URLs
    const hasBlob = (url: string) => url.startsWith("blob:");
    const isInvalidUrl = (url: string) => !url.startsWith("http://") && !url.startsWith("https://");

    if (validProfile.mainPhotoUrl && (hasBlob(validProfile.mainPhotoUrl) || isInvalidUrl(validProfile.mainPhotoUrl))) {
      return NextResponse.json({ error: "La URL de la foto de perfil no es válida o es de tipo blob." }, { status: 400 });
    }

    if (allPhotoUrls.some(url => hasBlob(url) || isInvalidUrl(url))) {
      return NextResponse.json({ error: "Una o más URLs de las fotos de galería no son válidas o son de tipo blob." }, { status: 400 });
    }

    if (allPhotoUrls.length > 5) {
      return NextResponse.json({ error: "No se permiten más de 5 fotos en total." }, { status: 400 });
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
        }
      });

      // Clear previous photos
      await prisma.photo.deleteMany({
        where: { userId: activeUserId }
      });

      // Save photos in Photo table
      if (allPhotoUrls.length > 0) {
        await prisma.photo.createMany({
          data: allPhotoUrls.map((url) => ({
            userId: activeUserId,
            url,
            isPrimary: url === validProfile.mainPhotoUrl,
            isApproved: true
          }))
        });
      }

      // Fetch the non-primary photos to return as gallery photos
      const savedPhotos = await prisma.photo.findMany({
        where: { userId: activeUserId, isPrimary: false },
        orderBy: { createdAt: "asc" }
      });

      return NextResponse.json({
        success: true,
        user: dbUser,
        profile: {
          ...dbProfile,
          photos: savedPhotos.map(p => p.url)
        }
      });
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

    // Combine mainPhotoUrl and any photos array
    const allPhotoUrls: string[] = [];
    if (validProfile.mainPhotoUrl) {
      allPhotoUrls.push(validProfile.mainPhotoUrl);
    }
    if (validProfile.photos && Array.isArray(validProfile.photos)) {
      validProfile.photos.forEach((url: string) => {
        if (url && !allPhotoUrls.includes(url)) {
          allPhotoUrls.push(url);
        }
      });
    }

    // Reject blob URLs and non-http URLs
    const hasBlob = (url: string) => url.startsWith("blob:");
    const isInvalidUrl = (url: string) => !url.startsWith("http://") && !url.startsWith("https://");

    if (validProfile.mainPhotoUrl && (hasBlob(validProfile.mainPhotoUrl) || isInvalidUrl(validProfile.mainPhotoUrl))) {
      return NextResponse.json({ error: "La URL de la foto de perfil no es válida o es de tipo blob." }, { status: 400 });
    }

    if (allPhotoUrls.some(url => hasBlob(url) || isInvalidUrl(url))) {
      return NextResponse.json({ error: "Una o más URLs de las fotos de galería no son válidas o son de tipo blob." }, { status: 400 });
    }

    if (allPhotoUrls.length > 5) {
      return NextResponse.json({ error: "No se permiten más de 5 fotos en total." }, { status: 400 });
    }

    try {
      const activeEmail = authUser?.email || body.email || "";

      // ── Step 1: Resolve the canonical userId for the Profile ──────────────
      // Use exclusively the Supabase ID
      const resolvedUserId = activeUserId;

      // Upsert User with current Supabase ID to ensure it exists
      await prisma.user.upsert({
        where: { id: resolvedUserId },
        update: {
          email: activeEmail,
        },
        create: {
          id: resolvedUserId,
          email: activeEmail,
          role: "USER",
        },
      });

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
          ...(validProfile.interestedIn !== undefined && { interestedIn: validProfile.interestedIn }),
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
          interestedIn: validProfile.interestedIn,
          mainPhotoUrl: validProfile.mainPhotoUrl,
          profileCompleted: validProfile.profileCompleted ?? false,
          height: validProfile.height,
          videoIntroUrl: validProfile.videoIntroUrl,
        },
      });

      // Check if photos is explicitly provided in the request body
      const rawProfile = body.profile || body;
      const hasPhotosArrayUpdate = rawProfile.photos !== undefined;
      const hasMainPhotoUrlUpdate = rawProfile.mainPhotoUrl !== undefined;

      if (hasPhotosArrayUpdate) {
        // Clear previous photos
        await prisma.photo.deleteMany({
          where: { userId: resolvedUserId }
        });

        // Save photos in Photo table
        if (allPhotoUrls.length > 0) {
          await prisma.photo.createMany({
            data: allPhotoUrls.map((url) => ({
              userId: resolvedUserId,
              url,
              isPrimary: url === (validProfile.mainPhotoUrl !== undefined ? validProfile.mainPhotoUrl : updatedProfile.mainPhotoUrl),
              isApproved: true
            }))
          });
        }
      } else if (hasMainPhotoUrlUpdate && validProfile.mainPhotoUrl) {
        // Only mainPhotoUrl was updated, photos array was not sent.
        // Update the mainPhotoUrl in Photo table:
        // Set all existing user photos to isPrimary: false
        await prisma.photo.updateMany({
          where: { userId: resolvedUserId },
          data: { isPrimary: false }
        });

        // Check if this URL already exists in user's photos
        const existingPhoto = await prisma.photo.findFirst({
          where: { userId: resolvedUserId, url: validProfile.mainPhotoUrl }
        });

        if (existingPhoto) {
          await prisma.photo.update({
            where: { id: existingPhoto.id },
            data: { isPrimary: true }
          });
        } else {
          await prisma.photo.create({
            data: {
              userId: resolvedUserId,
              url: validProfile.mainPhotoUrl,
              isPrimary: true,
              isApproved: true
            }
          });
        }
      }

      // Fetch latest photos to return
      const dbPhotos = await prisma.photo.findMany({
        where: { userId: resolvedUserId },
        orderBy: { createdAt: "asc" }
      });

      const allPhotos = dbPhotos.map(p => ({
        id: p.id,
        url: p.url,
        isPrimary: p.isPrimary,
        createdAt: p.createdAt,
      }));

      const galleryPhotos = dbPhotos.filter(p => !p.isPrimary).map(p => p.url);

      let resolvedMainPhotoUrl = updatedProfile.mainPhotoUrl;
      if (!resolvedMainPhotoUrl) {
        const primaryPhoto = dbPhotos.find(p => p.isPrimary);
        if (primaryPhoto) resolvedMainPhotoUrl = primaryPhoto.url;
        else if (dbPhotos.length > 0) resolvedMainPhotoUrl = dbPhotos[0].url;
      }

      // Upsert subscription if provided in body
      if (body.subscription) {
        await prisma.subscription.upsert({
          where: { userId: resolvedUserId },
          update: {
            tier: body.subscription.tier || "PREMIUM",
            isActive: body.subscription.isActive ?? true,
            expiresAt: body.subscription.expiresAt ? new Date(body.subscription.expiresAt) : null,
          },
          create: {
            userId: resolvedUserId,
            tier: body.subscription.tier || "PREMIUM",
            isActive: body.subscription.isActive ?? true,
            expiresAt: body.subscription.expiresAt ? new Date(body.subscription.expiresAt) : null,
          }
        });
      }

      return NextResponse.json({
        success: true,
        profile: {
          ...updatedProfile,
          mainPhotoUrl: resolvedMainPhotoUrl,
          allPhotos,
          photos: galleryPhotos
        }
      });
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

// DELETE: Delete user profile and all internal app data (DO NOT touch auth.users)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized access: Session invalid" }, { status: 401 });
    }

    const userId = user.id;

    // Delete User record from PostgreSQL (Cascade delete will clean up Profile, Photo, Like, Match, Message, ConversationParticipant, Conversation if orphan, Report, Block, Subscription)
    // CRITICAL: We DO NOT modify, delete, or touch auth.users or any Supabase auth tables.
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true, message: "Perfil interno eliminado correctamente." });
  } catch (err: any) {
    console.error("[DELETE PROFILE] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
