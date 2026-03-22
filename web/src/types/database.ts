export type ProfileRole = "student" | "instructor" | "admin";
export type CourseStatus = "draft" | "published" | "archived";
export type VideoProvider = "mux" | "cloudflare_stream" | "bunny" | "supabase_storage";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  bio: string | null;
  stripe_connect_account_id: string | null;
  instructor_payout_ready: boolean;
  created_at: string;
  updated_at: string;
};

export type InstructorPublic = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type Course = {
  id: string;
  instructor_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  price_cents: number;
  currency: string;
  platform_fee_bps: number;
  status: CourseStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
};

export type CourseLesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  duration_seconds: number | null;
  is_preview: boolean;
};

export type LessonVideoSecret = {
  lesson_id: string;
  video_provider: VideoProvider;
  video_asset_id: string;
};

export type LessonTask = {
  id: string;
  lesson_id: string;
  title: string;
  body: string | null;
  sort_order: number;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid_cents: number | null;
  platform_fee_cents: number | null;
  instructor_earning_cents: number | null;
  currency: string | null;
  created_at: string;
};
