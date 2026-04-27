import { useOutletContext } from 'react-router-dom'

export default function AboutIndex() {
  const { lang, t } = useOutletContext()

  return (
    <main className="about-index">
      <h1>{lang === 'ko' ? '지표 설명' : 'About the Indices'}</h1>
      <p>
        {lang === 'ko'
          ? 'Earth Doom Index는 4개 영역의 위협 신호를 종합한 지표입니다. 각 영역의 측정 방식과 데이터 출처를 자세히 알아보세요.'
          : 'Earth Doom Index combines threat signals from four domains. Explore how each is measured and sourced.'}
      </p>
      {/* AboutCard는 Task 14에서 추가 */}
    </main>
  )
}
