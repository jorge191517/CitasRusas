import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { uploadSchema } from "../../../lib/validation";

// POST: Upload files to Supabase Storage
export async function POST(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let authUserId = null;

    if (!isDevelopment) {
      // Enforce real Supabase Auth in production
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
      authUserId = user.id;
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    const activeUserId = authUserId || userId;

    if (!file || !activeUserId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
    }

    // Validate using Zod uploadSchema
    const uploadValidation = uploadSchema.safeParse({
      userId: activeUserId,
      fileType: file.type,
      fileSize: file.size
    });

    if (!uploadValidation.success) {
      return NextResponse.json({ error: uploadValidation.error.format() }, { status: 400 });
    }

    try {
      const supabaseServer = await createClient();
      // Unified bucket: 'profile-media' (matches onboarding client uploads)
      const BUCKET = "profile-media";
      const fileName = `${activeUserId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabaseServer.storage
        .from(BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (error) throw error;

      // Get public url
      const { data: publicUrlData } = supabaseServer.storage
        .from(BUCKET)
        .getPublicUrl(fileName);

      return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
    } catch (dbErr: any) {
      console.log("Supabase storage upload error:", dbErr.message);
      if (isDevelopment) {
        return NextResponse.json({
          success: true,
          mockMode: true,
          url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500"
        });
      }
      return NextResponse.json({ error: "File upload to storage failed" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
