import { z } from "zod";

// 1. Profile Schema Validation
export const profileSchema = z.object({
  firstName: z.string().min(2, "Name must be at least 2 characters").max(50),
  lastName: z.string().optional().default(""),
  birthDate: z.string().refine((val) => {
    const date = new Date(val);
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age >= 18;
  }, { message: "You must be at least 18 years old" }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  country: z.string().min(2, "Country must be specified"),
  city: z.string().optional().default(""),
  languages: z.array(z.string()).min(1, "Select at least one language").optional().default(["es"]),
  profession: z.string().max(100).optional().nullable(),
  maritalStatus: z.string().max(50).optional().nullable(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional().nullable(),
  interests: z.array(z.string()).optional().default([]),
  hobbies: z.array(z.string()).optional().default([]),
  lookingFor: z.string().optional().nullable(),
  interestedIn: z.string().optional().nullable(),
  mainPhotoUrl: z.string().optional().nullable().or(z.literal("")),
  photos: z.array(z.string()).max(5, "Maximum 5 photos allowed").optional().default([]),
  profileCompleted: z.boolean().optional().default(false),
  height: z.number().min(100).max(250).optional().nullable(),
  videoIntroUrl: z.string().optional().nullable().or(z.literal("")),
});

// 2. Message Schema Validation
export const messageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  text: z.string().max(1000, "Message cannot exceed 1000 characters").optional().nullable(),
  photoUrl: z.string().url("Invalid photo URL").optional().nullable().or(z.literal("")),
  audioUrl: z.string().url("Invalid audio URL").optional().nullable().or(z.literal("")),
}).refine((data) => data.text || data.photoUrl || data.audioUrl, {
  message: "Message must contain text, photo or audio",
});

// 3. Like/Swipe Schema Validation
export const likeSchema = z.object({
  receiverId: z.string().uuid("Invalid receiver user ID"),
  type: z.enum(["LIKE", "DISLIKE", "SUPER_LIKE"]),
});

// 4. Upload validation schema
export const uploadSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  fileType: z.string().refine((val) => {
    return ["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(val);
  }, { message: "Only Jpeg, Png, Webp images and Mp4 videos are allowed" }),
  fileSize: z.number().max(10 * 1024 * 1024, "File size cannot exceed 10MB"),
});
