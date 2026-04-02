import { useAuth } from '../context/AuthContext'

export default function Toast() {
  const { toast } = useAuth()

  if (!toast) return null

  const styles = {
    warning: 'bg-orange-500',
    error: 'bg-red-500',
    success: 'bg-green-500',
    info: 'bg-blue-500',
  }

  const icons = {
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle',
    success: 'fa-check-circle',
    info: 'fa-info-circle',
  }

  const bg = styles[toast.type] || styles.info
  const icon = icons[toast.type] || icons.info

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 ${bg} text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium animate-slide-down max-w-sm w-full mx-4`}>
      <i className={`fas ${icon} text-base`}></i>
      <span>{toast.message}</span>
    </div>
  )
}
