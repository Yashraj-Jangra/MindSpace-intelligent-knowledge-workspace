import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { createCanvas } from "@/lib/canvas-storage";

export const dynamic = "force-dynamic";

export default async function NewCanvasPage() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }

  const canvas = await createCanvas({
    userId: session.id,
    title: "Untitled MindSpace",
  });

  redirect(`/canvas/${canvas.id}`);
}
