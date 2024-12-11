import { getCurrentUser } from "@/server/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex h-screen items-center justify-center">
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
