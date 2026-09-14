import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import { createNote } from "@/lib/notes-storage";

export const dynamic = "force-dynamic";

export default async function NewNotePage() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }

  const note = await createNote({
    userId: session.id,
    title: "Untitled Note",
    content: "<p></p>",
  });

  redirect(`/notes/${note.id}`);
}
