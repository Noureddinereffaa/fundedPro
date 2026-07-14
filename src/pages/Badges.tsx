import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../components/Layout'
import { useBadges } from './hooks/useBadges'
import { SeoHead } from '../i18n/SeoHead'
import type { BadgeWithProgress, BadgeCategory } from '../../shared/types'

const CATEGORY_ORDER: BadgeCategory[] = ['progression', 'volume', 'profit', 'streak', 'risk', 'consistency', 'special']
const CATEGORY_ICONS: Record<string, string> = {
  progression: '📈', volume: '📊', profit: '💰', streak: '🔥', risk: '🛡️', consistency: '📅', special: '⭐',
}
const TIER_COLORS = ['#787b86', '#cd7f32', '#c0c0c0', '#ffd700', '#b026ff']
const TIER_NAMES = ['', 'Bronze', 'Silver', 'Gold', 'Platinum']

function BadgeCard({
  badge,
  onSelect,
}: {
  badge: BadgeWithProgress
  onSelect: (b: BadgeWithProgress) => void
}) {
  const { t } = useTranslation('common')
  const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS[0]
  const tierName = TIER_NAMES[badge.tier] || ''

  return (
    <button
      className={`badge-card ${badge.unlocked ? 'badge-unlocked' : ''}`}
      style={{
        border: `1px solid ${badge.unlocked ? tierColor : '#1f2937'}`,
        background: badge.unlocked ? 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(0,0,0,0.3) 100%)' : '#111827',
      }}
      onClick={() => onSelect(badge)}
      aria-label={`${badge.name} - ${badge.unlocked ? t('badges.unlocked') : `${Math.round(badge.progress * 100)}%`}`}
    >
      <div className="badge-icon" style={{ fontSize: '2rem' }} aria-hidden="true">
        {badge.icon}
      </div>
      <div className="badge-info">
        <div className="badge-name" style={{ color: badge.unlocked ? '#e0e0e0' : '#6b7280' }}>
          {badge.name}
        </div>
        <div className="badge-tier" style={{ color: tierColor, fontSize: '11px', fontWeight: 600 }}>
          {tierName}
        </div>
      </div>
      <div className="badge-progress-wrapper">
        <div
          className="badge-progress-bar"
          style={{
            width: `${Math.round(badge.progress * 100)}%`,
            background: badge.unlocked ? tierColor : '#3b82f6',
          }}
        />
      </div>
      <div className="badge-progress-text">
        {badge.unlocked
          ? t('badges.unlocked')
          : `${Math.round(badge.progress * 100)}%`}
      </div>
    </button>
  )
}

function BadgeModal({
  badge,
  onClose,
}: {
  badge: BadgeWithProgress | null
  onClose: () => void
}) {
  const { t } = useTranslation('common')
  if (!badge) return null
  const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS[0]
  const tierName = TIER_NAMES[badge.tier] || ''

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={badge.name}>
      <div
        className="badge-modal"
        style={{ background: '#1e222d', border: '1px solid #2a2e39', borderRadius: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label={t('actions.close')}>✕</button>
        <div className="badge-modal-header" style={{ textAlign: 'center', padding: '24px 32px 16px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }} aria-hidden="true">{badge.icon}</div>
          <h2 style={{ margin: 0, color: badge.unlocked ? '#e0e0e0' : '#6b7280' }}>{badge.name}</h2>
          <span
            style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '2px 12px',
              borderRadius: 999,
              background: `${tierColor}22`,
              color: tierColor,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {tierName}
          </span>
        </div>
        <div style={{ padding: '0 32px 24px', color: '#9ca3af', fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
          {badge.description}
        </div>
        <div style={{ padding: '0 32px 24px' }}>
          <div className="badge-progress-wrapper" style={{ height: 8 }}>
            <div
              className="badge-progress-bar"
              style={{
                width: `${Math.round(badge.progress * 100)}%`,
                background: badge.unlocked ? tierColor : '#3b82f6',
                height: 8,
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8,
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            <span>{badge.unlocked ? t('badges.completed') : `${Math.round(badge.progress * 100)}%`}</span>
            {badge.unlocked && badge.unlockedAt && (
              <span>{new Date(badge.unlockedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategorySection({
  category,
  badges,
  onSelect,
}: {
  category: string
  badges: BadgeWithProgress[]
  onSelect: (b: BadgeWithProgress) => void
}) {
  const { t } = useTranslation('common')
  const unlockedCount = badges.filter((b) => b.unlocked).length
  const catKey = `badges.categories.${category}`

  return (
    <section className="badge-category" style={{ marginBottom: 32 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: '1px solid #1f2937',
        }}
      >
        <span style={{ fontSize: '1.2rem' }} aria-hidden="true">{CATEGORY_ICONS[category] || '🏅'}</span>
        <h3 style={{ margin: 0, fontSize: 16, color: '#e0e0e0', fontWeight: 600 }}>
          {t(catKey)}
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
          {unlockedCount}/{badges.length}
        </span>
      </div>
      <div className="badge-grid">
        {badges.map((b) => (
          <BadgeCard key={b.id} badge={b} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}

export default function BadgesPage() {
  const { t } = useTranslation('common')
  const { grouped, loading, error, unlocked, total, refetch } = useBadges()
  const [selected, setSelected] = useState<BadgeWithProgress | null>(null)
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  const filteredSections = useMemo(() => {
    return CATEGORY_ORDER
      .filter((cat) => grouped[cat]?.length > 0)
      .map((cat) => ({
        category: cat,
        badges: grouped[cat].filter((b) => {
          if (filter === 'unlocked') return b.unlocked
          if (filter === 'locked') return !b.unlocked
          return true
        }),
      }))
      .filter((s) => s.badges.length > 0)
  }, [grouped, filter])

  return (
    <Layout>
      <SeoHead title="Badges &amp; Achievements" description="Track your ProFundX badges and achievements as you progress as a funded trader." />
      <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#e0e0e0' }}>{t('badges.title')}</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>
              {t('badges.subtitle', { unlocked, total })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'unlocked', 'locked'] as const).map((f) => (
              <button
                key={f}
                className={`badge-filter-btn ${filter === f ? 'active' : ''}`}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: `1px solid ${filter === f ? '#3b82f6' : '#1f2937'}`,
                  background: filter === f ? '#3b82f622' : 'transparent',
                  color: filter === f ? '#3b82f6' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={() => setFilter(f)}
              >
                {t(`badges.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Progress overview */}
        <div
          className="badges-overview"
          style={{
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#9ca3af' }}>
                <span>{t('badges.overallProgress')}</span>
                <span>{unlocked}/{total}</span>
              </div>
              <div className="badge-progress-wrapper" style={{ height: 10 }}>
                <div
                  className="badge-progress-bar"
                  style={{
                    width: `${total > 0 ? Math.round((unlocked / total) * 100) : 0}%`,
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    height: 10,
                  }}
                />
              </div>
            </div>
            <div className="badges-stats" style={{ display: 'flex', gap: 24, fontSize: 13, color: '#6b7280' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{unlocked}</div>
                <div>{t('badges.unlocked')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#6b7280' }}>{total - unlocked}</div>
                <div>{t('badges.locked')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6' }}>
                  {total > 0 ? Math.round((unlocked / total) * 100) : 0}%
                </div>
                <div>{t('badges.complete')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>{t('actions.loading')}</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>{t('errors.failedToLoad')}</div>
        ) : filteredSections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            {filter !== 'all' ? t('badges.noFilteredResults') : t('badges.noBadges')}
          </div>
        ) : (
          filteredSections.map((s) => (
            <CategorySection key={s.category} category={s.category} badges={s.badges} onSelect={setSelected} />
          ))
        )}
      </div>

      {/* Refresh hint */}
      {!loading && !error && (
        <button
          onClick={refetch}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid #1f2937',
            background: '#111827',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          aria-label={t('actions.refresh')}
          title={t('actions.refresh')}
        >
          ↻
        </button>
      )}

      <BadgeModal badge={selected} onClose={() => setSelected(null)} />
    </Layout>
  )
}
