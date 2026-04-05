import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState(null)
  const limit = 20

  const fetchUsers = useCallback(async (p = 1, q = '') => {
    setLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const params = new URLSearchParams({ page: p, limit })
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { 'x-id-token': idToken }
      })
      const data = await res.json()
      if (data.success) { setUsers(data.users); setTotal(data.total) }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers(page, search) }, [page, search, fetchUsers])

  const apiPatch = async (path, body) => {
    const idToken = await auth.currentUser.getIdToken()
    const res = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...body })
    })
    return res.json()
  }

  const apiDelete = async (path) => {
    const idToken = await auth.currentUser.getIdToken()
    const res = await fetch(path, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    })
    return res.json()
  }

  const toast = (msg, ok = true) => {
    setActionMsg({ msg, ok })
    setTimeout(() => setActionMsg(null), 3000)
  }

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    const data = await apiPatch(`/api/admin/users/${u.uid}/role`, { role: newRole })
    if (data.success) { toast(`Role updated to ${newRole}`); fetchUsers(page, search) }
    else toast(data.error || 'Error', false)
  }

  const toggleStatus = async (u) => {
    const data = await apiPatch(`/api/admin/users/${u.uid}/status`, { isActive: !u.isActive })
    if (data.success) { toast('Status updated'); fetchUsers(page, search) }
    else toast(data.error || 'Error', false)
  }

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.email || u.uid}? This cannot be undone.`)) return
    const data = await apiDelete(`/api/admin/users/${u.uid}`)
    if (data.success) { toast('User deleted'); fetchUsers(page, search) }
    else toast(data.error || 'Error', false)
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
            <span className="text-gray-900 font-semibold text-sm">User Management</span>
          </div>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">{total} total users</p>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, UID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Credits</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.displayName || u.fullName || '—'}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                        <div className="text-xs text-gray-300 font-mono">{u.uid.slice(0, 12)}…</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.examCredits ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleRole(u)}
                            title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors"
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote'}
                          </button>
                          <button
                            onClick={() => toggleStatus(u)}
                            title={u.isActive !== false ? 'Deactivate' : 'Activate'}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-yellow-300 hover:text-yellow-600 transition-colors"
                          >
                            {u.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteUser(u)}
                            title="Delete user"
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                          >
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
    </div>
  )
}
