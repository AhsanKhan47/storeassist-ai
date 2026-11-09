import { STORE_NAME } from "@storeassist/shared";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-3xl font-semibold">{STORE_NAME}</h1>
      <p className="text-lg">StoreAssist AI</p>
      <p className="text-sm text-gray-500">Demo with fictional sample data. Not a real store.</p>
    </main>
  );
}
