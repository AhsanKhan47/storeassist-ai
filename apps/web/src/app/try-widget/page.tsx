import type { Metadata } from "next";
import { WidgetPlayground } from "../../components/WidgetPlayground.tsx";

export const metadata: Metadata = {
  title: "Website widget | Tallow & Pine Help",
  description: "Try the store assistant as a floating chat button you can add to any website.",
};

export default function TryWidgetPage() {
  return <WidgetPlayground />;
}
