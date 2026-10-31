import type { LevelPay } from "@/lib/board";
import { formatSalary } from "@/lib/format";

export function LevelPayNote({
  companyName,
  pay,
}: {
  companyName: string;
  pay: LevelPay | null;
}) {
  if (!pay) {
    return null;
  }
  const range = formatSalary(pay.salaryMin, pay.salaryMax, pay.salaryCurrency);
  if (!range) {
    return null;
  }
  const roleWord = pay.count === 1 ? "role" : "roles";
  return (
    <p className="mt-4 text-sm leading-6 text-muted-foreground">
      Typical published pay for {pay.label.toLowerCase()} roles at {companyName} is {range}, from{" "}
      {pay.count} {roleWord} that list a range.
    </p>
  );
}
