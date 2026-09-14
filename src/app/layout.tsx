import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import { PomodoroTimer } from "@/components/tasks/PomodoroTimer";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";

export const metadata: Metadata = {
  title: "MindSpace | AI-Powered Visual Note-Taking & Mind-Mapping Platform",
  description:
    "Convert raw text dumps, prompts, and notes into structured visual node maps with AI copilot, node reminders, and webhooks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-[#0A0A0A] text-[#FAFAFA] antialiased selection:bg-[#FF3D00] selection:text-[#0A0A0A]"
        suppressHydrationWarning
      >
        <AuthProvider>
          <SocketProvider>
            <PomodoroProvider>
              {children}
              <PomodoroTimer />
              <ChatBubble />
              <CommandPalette />
              <KeyboardShortcutsModal />
            </PomodoroProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
