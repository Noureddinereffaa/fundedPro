import { useState, useEffect } from 'react'
import { Plus, Trash2, Tag, Percent, DollarSign, Activity } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../contexts/ToastContext'
import { useTranslation } from 'react-i18next'

interface Coupon {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { addToast } = useToast()
  const { t } = useTranslation('admin')

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    maxUses: '',
    expiresAt: ''
  })

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/admin/coupons')
      setCoupons(res.data)
    } catch (err: any) {
      addToast(err.response?.data?.error || t('coupons.loadingFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/admin/coupons', {
        ...formData,
        discountValue: Number(formData.discountValue),
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        expiresAt: formData.expiresAt || null
      })
      addToast(t('coupons.createdSuccess'), 'success')
      setShowModal(false)
      setFormData({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' })
      fetchCoupons()
    } catch (err: any) {
      addToast(err.response?.data?.error || t('coupons.createFailed'), 'error')
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/coupons/${id}`, { isActive: !currentStatus })
      setCoupons(coupons.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c))
      addToast(t('coupons.statusUpdated'), 'success')
    } catch (err) {
      addToast(t('coupons.statusFailed'), 'error')
    }
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm(t('coupons.deleteConfirm'))) return
    try {
      await api.delete(`/admin/coupons/${id}`)
      setCoupons(coupons.filter(c => c.id !== id))
      addToast(t('coupons.deletedSuccess'), 'success')
    } catch (err) {
      addToast(t('coupons.deleteFailed'), 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('coupons.title')}</h1>
          <p className="text-gray-400 mt-1">{t('coupons.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          {t('coupons.createCoupon')}
        </button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="border-b border-gray-800 bg-gray-900/80 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">{t('coupons.code')}</th>
                <th className="px-6 py-4">{t('coupons.discount')}</th>
                <th className="px-6 py-4">{t('coupons.usage')}</th>
                <th className="px-6 py-4">{t('coupons.expiry')}</th>
                <th className="px-6 py-4">{t('coupons.status')}</th>
                <th className="px-6 py-4 text-right">{t('coupons.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag className="h-8 w-8 text-gray-600" />
                      <p>{t('coupons.noCoupons')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-sm font-semibold text-indigo-400 border border-indigo-500/20">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-200">
                      {coupon.discountType === 'percentage' 
                        ? <span className="flex items-center gap-1 text-green-400"><Percent className="h-3.5 w-3.5"/> {coupon.discountValue}%</span>
                        : <span className="flex items-center gap-1 text-green-400"><DollarSign className="h-3.5 w-3.5"/> ${coupon.discountValue}</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Activity className="h-4 w-4 text-gray-500" />
                        <span>{coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : `(${t('coupons.unlimited')})`}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : t('coupons.never')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(coupon.id, coupon.isActive)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          coupon.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        }`}
                      >
                        {coupon.isActive ? t('coupons.active') : t('coupons.inactive')}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
                        title={t('coupons.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={t('coupons.createPromoCode')}>
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 p-6">
              <h2 className="text-xl font-bold text-white">{t('coupons.createPromoCode')}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={t('coupons.cancel')}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">{t('coupons.couponCode')} *</label>
                <input
                  type="text"
                  required
                  placeholder={t('coupons.couponCodePlaceholder')}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none uppercase"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">{t('coupons.discountType')}</label>
                  <select
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  >
                    <option value="percentage">{t('coupons.percentage')}</option>
                    <option value="fixed">{t('coupons.fixed')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">{t('coupons.discountValue')} *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">{t('coupons.maxUses')}</label>
                  <input
                    type="number"
                    min="1"
                    placeholder={t('coupons.maxUsesPlaceholder')}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">{t('coupons.expiresAt')}</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  {t('coupons.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  {t('coupons.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
