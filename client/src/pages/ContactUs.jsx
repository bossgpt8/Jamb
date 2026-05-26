import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ContactUs() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const contactItems = [
    { iconClass: 'fas fa-envelope', iconBgClass: 'bg-blue-100', iconTextClass: 'text-blue-600', label: 'Email', value: 'osanisrael2@gmail.com', href: 'mailto:osanisrael2@gmail.com' },
    { iconClass: 'fas fa-comments', iconBgClass: 'bg-green-100', iconTextClass: 'text-green-600', label: 'Community Chat', value: 'Chat with our community', onClick: () => navigate('/community') },
    { iconClass: 'fab fa-whatsapp', iconBgClass: 'bg-green-100', iconTextClass: 'text-green-600', label: 'WhatsApp Support', value: '+2349164898577', href: 'https://wa.me/2349164898577' },
    { iconClass: 'fas fa-phone', iconBgClass: 'bg-blue-100', iconTextClass: 'text-blue-600', label: 'Call Support', value: '+2349164898577', href: 'tel:+2349164898577' },
    { iconClass: 'fas fa-clock', iconBgClass: 'bg-purple-100', iconTextClass: 'text-purple-600', label: 'Response Time', value: 'Within 24 hours' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setSent(true)
    } catch (e) { setSent(true) }
    setSending(false)
  }

  return (
    <div className="bg-gray-50 font-sans min-h-screen page-fade-in">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate('/')} className="flex items-center">
              <i className="fas fa-graduation-cap text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold text-gray-900">JambGenius </span>
            </button>
            <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600">
              <i className="fas fa-arrow-left mr-2"></i>Home
            </button>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-violet-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-xl text-gray-600">We're here to help. Get in touch with our support team</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get In Touch</h2>
            {sent ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <i className="fas fa-check-circle text-4xl text-green-500 mb-3 block"></i>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-600">Thank you for contacting us. We'll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="mt-4 text-blue-600 hover:underline">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { field: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
                  { field: 'email', label: 'Email Address', type: 'email', placeholder: 'your@email.com' },
                  { field: 'subject', label: 'Subject', type: 'text', placeholder: 'How can we help?' },
                ].map(f => (
                  <div key={f.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} required value={form[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    rows={5} placeholder="Tell us how we can help..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={sending}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                  {sending ? <><i className="fas fa-spinner fa-spin mr-2"></i>Sending...</> : <><i className="fas fa-paper-plane mr-2"></i>Send Message</>}
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
            <div className="space-y-4">
              {contactItems.map((c, i) => {
                const content = (
                  <>
                    <div className={`w-12 h-12 ${c.iconBgClass} rounded-xl flex items-center justify-center`}>
                      <i className={`${c.iconClass} ${c.iconTextClass} text-xl`}></i>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.label}</p>
                      <p className="text-gray-600 text-sm">{c.value}</p>
                    </div>
                  </>
                )

                if (c.href) {
                  return (
                    <a
                      key={i}
                      href={c.href}
                      target={c.href.startsWith('http') ? '_blank' : undefined}
                      rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
                      className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      {content}
                    </a>
                  )
                }

                if (c.onClick) {
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={c.onClick}
                      className="w-full flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      {content}
                    </button>
                  )
                }

                return (
                  <div key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                    {content}
                  </div>
                )
              })}
            </div>
            <div className="mt-6 bg-blue-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-2">Quick Help</h3>
              <p className="text-sm text-gray-600 mb-3">Before reaching out, check our FAQ section for immediate answers.</p>
              <button onClick={() => navigate('/help')} className="text-blue-600 font-medium hover:underline text-sm">
                <i className="fas fa-life-ring mr-1"></i>Visit Help Center
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
