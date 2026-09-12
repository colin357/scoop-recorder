import { calendarProviderConfigured } from "@/lib/calendar";
import SocialButtons from "@/components/social-buttons";
import LoginForm from "./form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-clay">{error === "state_mismatch" ? "Sign-in session expired. Try again." : error === "provider_unavailable" ? "That sign-in method isn't available." : decodeURIComponent(error)}</p>}
      <LoginForm next={next} />
      <SocialButtons google={calendarProviderConfigured("google")} microsoft={calendarProviderConfigured("microsoft")} next={next} />
    </div>
  );
}
