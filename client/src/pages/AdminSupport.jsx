import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function AdminSupport() {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState(null)
  const [resolveModal, setResolveModal] = useState(null) // ticket
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const limit = 20

  const fetchTickets = useCallback(async (p = 1, status = '') => {
    setLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const params = new URLSearchParams({ page: p, limit })
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/feedback?${params}`, { headers: { 'x-id-token': idToken } })
      const data = await res.json()
      if (data.success) { setTickets(data.tickets); setTotal(data.total) }
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTickets(page, statusFilter) }, [page, statusFilter, fetchTickets])

  const toast = (msg, ok = true) => {
    setActionMsg({ msg, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  const resolve = async () => {
    setSaving(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/admin/feedback/${resolveModal._id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, notes })
      })
      const data = await res.json()
      if (data.success) { toast('Ticket resolved'); setResolveModal(null); fetchTickets(page, statusFilter) }
      else toast(data.error || 'Error', false)
    } catch (err) { toast(err.message, false) }
    setSaving(false)
  }

  const reopen = async (ticket) => {
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/admin/feedback/${ticket._id}/reopen`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      })
      const data = await res.json()
      if (data.success) { toast('Ticket reopened'); fetchTickets(page, statusFilter) }
      else toast(data.error || 'Error', false)
    } catch (err) { toast(err.message, false) }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1">
              <i className="fas fa-arrow-left"></i> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold text-sm">Support & Feedback</span>
          </div>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500">{total} tickets</p>
          </div>
          <div className="flex gap-2">
            {['', 'open', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {actionMsg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${actionMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {actionMsg.msg}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl shadow-sm">No tickets found.</div>
          ) : tickets.map(t => (
            <div key={t._id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {t.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{t.subject}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{t.message}</p>
                  <div className="text-xs text-gray-400">
                    From: <span className="font-medium text-gray-600">{t.name}</span> &lt;{t.email}&gt; · {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                  </div>
                  {t.notes && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-medium">Admin notes:</span> {t.notes}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {t.status === 'open' ? (
                    <button
                      onClick={() => { setResolveModal(t); setNotes('') }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-medium transition-colors"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => reopen(t)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-medium transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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

      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Resolve Ticket</h2>
            <p className="text-sm text-gray-500 mb-4">{resolveModal.subject}</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this resolution…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setResolveModal(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={resolve} disabled={saving} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
