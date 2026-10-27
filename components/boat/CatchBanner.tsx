import { ART, artBg } from "@/lib/boat/art";
import { FISH } from "@/lib/boat/race";

// 가장 희귀한 물고기를 낚은 순간 잠깐 띄우는 기념 컷
export default function CatchBanner({ show }: { show: boolean }) {
  if (!show) return null;
  const fish = FISH[FISH.length - 1];
  return (
    <div className="pointer-events-none absolute right-4 top-1/4 w-44 overflow-hidden rounded-2xl border-2 border-amber-300 bg-black/40 shadow-2xl sm:w-56">
      <div className="aspect-[4/5] w-full bg-cover bg-center" style={artBg(ART.marlin)} />
      <div className="bg-amber-300 px-3 py-1.5 text-center text-sm font-black text-sky-950">
        {fish.emoji} {fish.name} +{fish.value}
      </div>
    </div>
  );
}
