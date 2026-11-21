import type { Metadata } from "next";
import { Chat } from "../../components/Chat.tsx";

// The compact chat shown inside the website widget (public/widget.js loads it in an iframe).
export const metadata: Metadata = {
  title: "Tallow & Pine Help (chat)",
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return <Chat variant="embed" />;
}
