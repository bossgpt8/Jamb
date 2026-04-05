import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function AdminPayments() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [creditModal, setCreditModal] = useState(null) // { uid, name, credits }
  const [creditValue, setCreditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState(null)
  const limit = 20

  const fetchPayments = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/admin/payments?page=${p}&limit=${limit}`, {
        headers: { 'x-id-token': idToken }
      })
      const data = await res.json()
      if (data.success) { setPayments(data.payments); setTotal(data.total) }
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPayments(page) }, [page, fetchPayments])

  const toast = (msg, ok = true) => {
    setActionMsg({ msg, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  const saveCredits = async () => {
    const credits = Number(creditValue)
    if (isNaN(credits) || credits < 0) { toast('Enter a valid number', false); return }
    setSaving(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/admin/users/${creditModal.uid}/credits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, credits })
      })
      const data = await res.json()
      if (data.success) { toast('Credits updated'); setCreditModal(null) }
      else toast(data.error || 'Error', false)
    } catch (err) { toast(err.message, false) }
    setSaving(false)
  }

  const totalPages = Math.ceil(total / limit)
  const formatAmount = (amount) => amount ? `₦${(amount / 100).toLocaleString()}` : '—'

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
              <i className="fas fa-arrow-left"></i> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold text-sm">Payments</span>
          </div>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">Payments & Credits</h1>
          <p className="text-sm text-gray-500">{total} transactions</p>
        </div>

        {actionMsg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${actionMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {actionMsg.msg}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Credits</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.userName || '—'}</div>
                        <div className="text-xs text-gray-400">{p.userEmail}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.reference || '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatAmount(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-700">{p.credits ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setCreditModal({ uid: p.userId, name: p.userName || p.userEmail }); setCreditValue('') }}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                          Set Credits
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {creditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Set Exam Credits</h2>
            <p className="text-sm text-gray-500 mb-4">{creditModal.name}</p>
            <input
              type="number"
              min="0"
              value={creditValue}
              onChange={e => setCreditValue(e.target.value)}
              placeholder="Number of credits"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setCreditModal(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCredits} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
