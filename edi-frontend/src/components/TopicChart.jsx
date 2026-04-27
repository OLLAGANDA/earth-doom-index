/**
 * 토픽별 추세 차트 placeholder.
 *
 * Phase 1에선 안내 박스만 표시한다. Phase 2에서 recharts로 실 차트 구현 예정.
 *
 * @param kind - 'society' | 'climate' | 'economy' | 'solar'
 * @param days - 표시할 기간 (현재 미사용, Phase 2 구현 시 활용)
 */
export default function TopicChart({ kind, days = 30 }) {
  return (
    <div className="topic-chart-placeholder nes-container is-dark">
      <p>📊 {kind.toUpperCase()} 최근 {days}일 추세 차트가 여기에 표시됩니다.</p>
      <p className="sub-text">Phase 2에서 구현 예정.</p>
    </div>
  )
}
