import { useState, useEffect } from 'react'
import { adminApi } from '../../utils/api.ts'
import { useToast } from '../../contexts/ToastContext.tsx'
import { Save, Plus, Link as LinkIcon, Trash2 } from 'lucide-react'
import { SeoHead } from '../../i18n/SeoHead'

interface Setting {
  key: string
  value: string
  description?: string
  isPublic: boolean
}

const DEFAULT_SETTINGS = [
  { key: 'social_twitter', label: 'Twitter/X URL', defaultVal: 'https://twitter.com/profundx' },
  { key: 'social_telegram', label: 'Telegram URL', defaultVal: 'https://t.me/profundx' },
  { key: 'social_discord', label: 'Discord URL', defaultVal: 'https://discord.gg/profundx' },
  { key: 'contact_email', label: 'Support Email', defaultVal: 'support@profundx.com' },
]

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const fetchSettings = async () => {
    try {
      const res = await adminApi.getSettings()
      setSettings(Array.isArray(res) ? res : (res.data || []))
    } catch (err: unknown) {
      addToast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (key: string, value: string, isPublic = true) => {
    try {
      await adminApi.updateSetting({ key, value, isPublic })
      addToast('Setting saved', 'success')
      fetchSettings()
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to save setting', 'error')
    }
  }

  const getValue = (key: string) => {
    return settings.find((s) => s.key === key)?.value || ''
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div className="space-y-6">
      <SeoHead title="Admin: Settings" description="Manage ProFundX platform settings and configuration." noIndex={true} />
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-gray-400 mt-1">Manage global configuration and social links</p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-indigo-400" />
            Social Media Links
          </h2>
          <div className="space-y-4">
            {DEFAULT_SETTINGS.map((ds) => {
              const currentVal = getValue(ds.key)
              return (
                <div key={ds.key} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-400">{ds.label}</label>
                    <input
                      type="text"
                      placeholder={ds.defaultVal}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
                      defaultValue={currentVal}
                      onBlur={(e) => {
                        if (e.target.value !== currentVal) handleSave(ds.key, e.target.value, true)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(ds.key, e.currentTarget.value, true)
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.querySelector(`input[placeholder="${ds.defaultVal}"]`) as HTMLInputElement
                      if (input) handleSave(ds.key, input.value, true)
                    }}
                    className="mb-0.5 rounded-lg bg-gray-800 p-2.5 text-gray-400 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
