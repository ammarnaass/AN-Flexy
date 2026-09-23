import { ui } from '../messages.ar'

// صفحة عامة للشاشات التي لم تُبنَ بعد (المرحلة 1: هيكل فارغ لكل شاشة — AN-Flexy-Plan §4).
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <section className="flex h-full flex-col gap-2">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-neutral-400">{ui.comingSoon}</p>
    </section>
  )
}
