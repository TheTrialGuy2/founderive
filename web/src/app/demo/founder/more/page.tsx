import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { MORE_LINKS } from "@/lib/nav";

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
        {[...MORE_LINKS, { href: "/demo/onboarding", label: "Edit profile" }, { href: "/demo/design-system", label: "Design system" }].map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center justify-between px-4 py-3.5 text-sm">
              {l.label}
              <Icon name="next" className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
