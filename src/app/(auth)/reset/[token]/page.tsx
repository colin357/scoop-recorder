import ResetForm from "./form";

export default async function ResetPage({ params }: PageProps<"/reset/[token]">) {
  const { token } = await params;
  return <ResetForm token={token} />;
}
