import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

const SUBJECTS = ['english', 'mathematics', 'physics', 'chemistry', 'biology', 'economics', 'government', 'literature']
const EMPTY_FORM = { subject: '', question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', explanation: '', year: '', topic: '', diagram_url: '' }

export default function AdminContent() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterSubject, setFilterSubject] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState(null)
  const [modal, setModal] = useState(null) // null | { mode: 'create'|'edit', data: {} }
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const limit = 20

  const fetchQuestions = useCallback(async (p = 1, subject = '', q = '') => {
    setLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const params = new URLSearchParams({ page: p, limit })
      if (subject) params.set('subject', subject)
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/questions?${params}`, { headers: { 'x-id-token': idToken } })
      const data = await res.json()
      if (data.success) { setQuestions(data.questions); setTotal(data.total) }
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchQuestions(page, filterSubject, search) }, [page, filterSubject, search, fetchQuestions])

  const toast = (msg, ok = true) => {
    setActionMsg({ msg, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: 'create' }) }
  const openEdit = (q) => { setForm({ subject: q.subject || '', question: q.question || '', option_a: q.option_a || '', option_b: q.option_b || '', option_c: q.option_c || '', option_d: q.option_d || '', correct_answer: q.correct_answer || '', explanation: q.explanation || '', year: q.year || '', topic: q.topic || '', diagram_url: q.diagram_url || '' }); setModal({ mode: 'edit', id: q._id }) }

  const handleSave = async () => {
    if (!form.subject || !form.question || !form.correct_answer) {
      toast('Subject, question, and correct answer are required.', false); return
    }
    setSaving(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const url = modal.mode === 'create' ? '/api/admin/questions' : `/api/admin/questions/${modal.id}`
      const method = modal.mode === 'create' ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, ...form, year: form.year ? Number(form.year) : undefined })
      })
      const data = await res.json()
      if (data.success) {
        toast(modal.mode === 'create' ? 'Question created' : 'Question updated')
        setModal(null)
        fetchQuestions(page, filterSubject, search)
      } else {
        toast(data.error || 'Error', false)
      }
    } catch (err) { toast(err.message, false) }
    setSaving(false)
  }

  const deleteQuestion = async (q) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return
    try {
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/admin/questions/${q._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      })
      const data = await res.json()
      if (data.success) { toast('Question deleted'); fetchQuestions(page, filterSubject, search) }
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
            <span className="text-gray-900 font-semibold text-sm">Content Management</span>
          </div>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Questions</h1>
            <p className="text-sm text-gray-500">{total} total questions</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterSubject}
              onChange={(e) => { setFilterSubject(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <input
              type="text"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
              <i className="fas fa-plus"></i> Add Question
            </button>
          </div>
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
          ) : questions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No questions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-1/2">Question</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Year</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Topic</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {questions.map((q) => (
                    <tr key={q._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 max-w-xs">
                        <div className="truncate">{q.question}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-gray-600">{q.subject}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{q.year || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{q.topic || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(q)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                            <i className="fas fa-pen"></i>
                          </button>
                          <button onClick={() => deleteQuestion(q)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors">
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
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

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{modal.mode === 'create' ? 'Add Question' : 'Edit Question'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-lg"></i></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject <span className="text-red-500">*</span></label>
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="e.g. 2024" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input type="text" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Quadratic Equations" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question <span className="text-red-500">*</span></label>
                <textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {['a', 'b', 'c', 'd'].map(opt => (
                <div key={opt}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Option {opt.toUpperCase()}</label>
                  <input type="text" value={form[`option_${opt}`]} onChange={e => setForm(f => ({ ...f, [`option_${opt}`]: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer <span className="text-red-500">*</span></label>
                <input type="text" value={form.correct_answer} onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))} placeholder="e.g. A or full text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagram URL</label>
                <input type="url" value={form.diagram_url} onChange={e => setForm(f => ({ ...f, diagram_url: e.target.value }))} placeholder="https://…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
                {modal.mode === 'create' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
