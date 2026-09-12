import { calendarProviderConfigured } from "@/lib/calendar";
import SocialButtons from "@/components/social-buttons";
import SignupForm from "./form";

export default function SignupPage() {
  return (
    <div className="space-y-4">
      <SignupForm />
      <SocialButtons google={calendarProviderConfigured("google")} microsoft={calendarProviderConfigured("microsoft")} />
    </div>
  );
}
