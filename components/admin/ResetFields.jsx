'use client'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const PRESETS = [
  { label: '매일 오전 6시', type: 'daily', day: null, hour: 6 },
  { label: '매주 월요일 오전 6시', type: 'weekly', day: 1, hour: 6 },
]

function matchPreset(type, day, hour) {
  return PRESETS.findIndex(
    p => p.type === type && (p.day ?? null) === (day ?? null) && p.hour === (hour ?? 6)
  )
}

export default function ResetFields({ resetType, resetDay, resetHour, onChange }) {
  const hasReset = resetType && resetType !== 'none'
  const activePreset = hasReset ? matchPreset(resetType, resetDay, resetHour) : -1
  const isCustom = hasReset && activePreset === -1

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!hasReset}
          onChange={e => {
            if (e.target.checked) {
              onChange('reset_type', 'daily')
              onChange('reset_day', null)
              onChange('reset_hour', 6)
            } else {
              onChange('reset_type', 'none')
              onChange('reset_day', null)
            }
          }}
          style={{ accentColor: 'var(--sage)' }}
        />
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>초기화 있음</span>
      </label>

      {hasReset && (
        <div className="pl-2 space-y-2">
          {/* 프리셋 버튼 */}
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange('reset_type', p.type)
                  onChange('reset_day', p.day)
                  onChange('reset_hour', p.hour)
                }}
                className={`px-3 py-1 rounded text-xs transition-colors ${activePreset === i ? 'btn-primary' : 'btn-ghost-sm'}`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                // 직접 입력으로 전환: 현재 값을 유지하되 preset에 없는 값으로 변경
                if (!isCustom) {
                  onChange('reset_type', 'daily')
                  onChange('reset_day', null)
                  onChange('reset_hour', 0)
                }
              }}
              className={`px-3 py-1 rounded text-xs transition-colors ${isCustom ? 'btn-primary' : 'btn-ghost-sm'}`}
            >
              직접 입력
            </button>
          </div>

          {/* 직접 입력 필드 */}
          {isCustom && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={resetType}
                onChange={e => {
                  onChange('reset_type', e.target.value)
                  if (e.target.value === 'daily') onChange('reset_day', null)
                }}
                className="input-field rounded px-2 py-1 text-xs"
              >
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
              </select>
              {resetType === 'weekly' && (
                <select
                  value={resetDay ?? 1}
                  onChange={e => onChange('reset_day', Number(e.target.value))}
                  className="input-field rounded px-2 py-1 text-xs"
                >
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                </select>
              )}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={resetHour ?? 0}
                  min={0}
                  max={23}
                  onChange={e => onChange('reset_hour', Number(e.target.value))}
                  onFocus={e => e.target.select()}
                  className="input-field w-14 rounded px-2 py-1 text-xs text-center"
                />
                <span className="text-xs" style={{ color: 'var(--ink)' }}>시</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
