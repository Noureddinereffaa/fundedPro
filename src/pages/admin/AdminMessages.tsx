import { useState, useEffect } from 'react'
import { adminApi } from '../../utils/api.ts'
import { useToast } from '../../contexts/ToastContext.tsx'
import { Mail, CheckCircle, Trash2, Clock } from 'lucide-react'

interface Message {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'unread' | 'read' | 'resolved'
  createdAt: string
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const fetchMessages = async () => {
    try {
      const res = await adminApi.getContactMessages()
      setMessages(Array.isArray(res) ? res : (res.data || []))
    } catch (err: any) {
      addToast('Failed to load messages', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await adminApi.updateContactMessage(id, { status })
      setMessages(messages.map(m => m.id === id ? { ...m, status: status as any } : m))
      addToast('Status updated', 'success')
    } catch (err) {
      addToast('Failed to update status', 'error')
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      await adminApi.deleteContactMessage(id)
      setMessages(messages.filter(m => m.id !== id))
      addToast('Message deleted', 'success')
    } catch (err) {
      addToast('Failed to delete message', 'error')
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Messages</h1>
        <p className="text-gray-400 mt-1">Manage incoming messages from the contact form</p>
      </div>

      <div className="grid gap-4">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-500">
            <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`rounded-xl border ${msg.status === 'unread' ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-gray-800 bg-gray-900/50'} p-6 transition-colors`}>
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {msg.status === 'unread' && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                    {msg.subject}
                  </h3>
                  <div className="text-sm text-gray-400 mt-1">
                    From: <span className="text-gray-200">{msg.name}</span> ({msg.email})
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="text-gray-300 bg-gray-800/50 rounded-lg p-4 mb-4 whitespace-pre-wrap">
                {msg.message}
              </div>

              <div className="flex justify-between items-center border-t border-gray-800 pt-4">
                <div className="flex gap-2">
                  <select
                    value={msg.status}
                    onChange={(e) => updateStatus(msg.id, e.target.value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none ${
                      msg.status === 'unread' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' :
                      msg.status === 'resolved' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                      'border-gray-700 bg-gray-800 text-gray-300'
                    }`}
                  >
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
