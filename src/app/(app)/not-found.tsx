import Link from "next/link";
import { Empty } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto pt-10">
      <Empty title="Rocky sniffed around and couldn't find that." pose="alert" action={<><Link href="/dashboard" className="btn-primary">Back to home</Link><Link href="/meetings" className="btn-secondary">Meetings</Link></>}>
        It may have been deleted, or the link is wrong.
      </Empty>
    </div>
  );
}
