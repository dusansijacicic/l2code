import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePlaybackPayload } from "@/lib/video/playback";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId obavezan" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Nisi ulogovan" }, { status: 401 });
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("course_lessons")
    .select("id, is_preview, module_id")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: "Lekcija nije pronađena" }, { status: 404 });
  }

  const { data: mod, error: modError } = await supabase
    .from("course_modules")
    .select("course_id")
    .eq("id", lesson.module_id)
    .single();

  if (modError || !mod) {
    return NextResponse.json({ error: "Modul nije pronađen" }, { status: 404 });
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, status, instructor_id")
    .eq("id", mod.course_id)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Kurs nije pronađen" }, { status: 404 });
  }

  const courseId = course.id;
  const isInstructor = course.instructor_id === userData.user.id;
  let enrolled = false;
  if (!isInstructor) {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    enrolled = !!enr;
  }

  const canWatch = isInstructor || enrolled || (course.status === "published" && lesson.is_preview);
  if (!canWatch) {
    return NextResponse.json({ error: "Nemaš pristup ovoj lekciji" }, { status: 403 });
  }

  const { data: secret, error: secretError } = await supabase
    .from("lesson_video_secrets")
    .select("video_provider, video_asset_id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (secretError || !secret) {
    return NextResponse.json({
      playbackUrl: null,
      message: "Video još nije postavljen za ovu lekciju.",
    });
  }

  const payload = resolvePlaybackPayload(secret.video_provider, secret.video_asset_id);

  return NextResponse.json({
    playbackUrl: payload.playbackUrl,
    expiresInSeconds: payload.expiresInSeconds,
    message: payload.playbackUrl
      ? undefined
      : "Podesi MUX_SIGNED_PLAYBACK_BASE_URL ili CF_STREAM_CUSTOMER_SUBDOMAIN u .env (vidi README).",
  });
}
