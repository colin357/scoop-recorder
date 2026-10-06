import { redirect } from "next/navigation";

/** The old form-only setup now lives at /onboarding. */
export default function OnboardingFormPage() {
  redirect("/onboarding");
}
