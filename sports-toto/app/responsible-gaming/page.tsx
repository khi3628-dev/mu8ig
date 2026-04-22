export default function ResponsibleGamingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">책임 게이밍 안내</h1>

      <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4">
        <h2 className="font-semibold mb-2">본 서비스는 시뮬레이션입니다</h2>
        <p className="text-sm leading-relaxed">
          Demo Toto MY 는 교육/포트폴리오 목적의 데모입니다. 실제 현금이
          걸리지 않지만, 구성상 성인 전용으로 제공되며 책임 있는 이용을
          권장합니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">자가 점검 체크리스트</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>잃어도 괜찮은 금액만 사용하고 있나요?</li>
          <li>손실을 만회하려고 계속 베팅하고 있지는 않나요?</li>
          <li>가족/친구에게 베팅 금액이나 빈도를 숨기고 있지는 않나요?</li>
          <li>베팅이 일상생활, 업무, 수면에 영향을 주고 있지는 않나요?</li>
        </ul>
        <p className="text-sm">
          위 항목 중 하나라도 해당된다면, 이용을 중단하고 도움을 받는 것을
          고려해주세요.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">도움 받을 수 있는 곳</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>한국 도박문제예방치유원</strong> — 국번없이 1336 (24시간
            상담), <a className="underline" href="https://www.kcgp.or.kr" target="_blank" rel="noreferrer">kcgp.or.kr</a>
          </li>
          <li>
            <strong>Befrienders Kuala Lumpur</strong> — +60-3-7956 8145,{" "}
            <a className="underline" href="https://www.befrienders.org.my" target="_blank" rel="noreferrer">befrienders.org.my</a>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">법적 고지</h2>
        <p className="text-sm leading-relaxed">
          말레이시아에서 숫자 예측 게임과 온라인 도박을 운영하려면 Pool Betting
          Act 1967 및 Common Gaming Houses Act 1953 에 따른 재무부 라이선스가
          필요하며, 온라인 전달은 MCMC (말레이시아 커뮤니케이션·멀티미디어
          위원회) 감독 대상입니다. 본 프로젝트는{" "}
          <strong>라이선스를 받지 않은 교육/포트폴리오 데모</strong>이며,
          실제 운영 용도로 사용해서는 안 됩니다.
        </p>
      </section>
    </div>
  );
}
