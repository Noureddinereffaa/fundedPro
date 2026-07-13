export type NavLink = {
  path: string
  labelKey: string
  icon: string
  requiresAuth?: boolean
}

export type NavSection = {
  titleKey: string
  links: NavLink[]
}

export const sidebarSections: NavSection[] = [
  {
    titleKey: 'nav.overview',
    links: [
      { path: '/dashboard', labelKey: 'nav.dashboard', icon: '📊' },
      { path: '/trade', labelKey: 'nav.trade', icon: '📈', requiresAuth: true },
      { path: '/portfolio', labelKey: 'nav.portfolio', icon: '💼' },
      { path: '/history', labelKey: 'nav.history', icon: '📜', requiresAuth: true },
    ]
  },
  {
    titleKey: 'nav.management',
    links: [
      { path: '/profile', labelKey: 'nav.profile', icon: '👤', requiresAuth: true },
      { path: '/kyc', labelKey: 'nav.profile', icon: '🆔', requiresAuth: true },
      { path: '/payout', labelKey: 'nav.payout', icon: '💸', requiresAuth: true },
      { path: '/alerts', labelKey: 'nav.alerts', icon: '🔔', requiresAuth: true },
      { path: '/badges', labelKey: 'nav.badges', icon: '🏅', requiresAuth: true },
    ]
  },
  {
    titleKey: 'nav.community',
    links: [
      { path: '/leaderboard', labelKey: 'nav.leaderboard', icon: '🏆' },
      { path: '/referral', labelKey: 'nav.referral', icon: '🎁', requiresAuth: true },
      { path: '/pricing', labelKey: 'nav.pricing', icon: '💰' },
    ]
  }
]
