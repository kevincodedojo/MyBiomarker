import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col items-center gap-6 pt-16 text-center">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-fg-secondary">{user?.email}</p>
      </div>
      <SignOutButton />
      <p className="text-xs text-fg-muted">
        Units preference, data export, and account deletion arrive in M4/M5.
      </p>
    </div>
  );
}
