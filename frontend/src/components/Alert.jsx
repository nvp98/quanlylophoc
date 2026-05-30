import { AlertCircle, CheckCircle, InfoIcon, XCircle } from 'lucide-react'
import { useState } from 'react'

export function Alert({ type = 'info', title, message, onClose }) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    onClose?.()
  }

  if (!visible) return null

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="text-green-600" size={20} />
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle className="text-red-600" size={20} />
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertCircle className="text-yellow-600" size={20} />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <InfoIcon className="text-blue-600" size={20} />
    }
  }

  const style = styles[type]

  return (
    <div className={`${style.bg} ${style.border} ${style.text} border rounded-lg p-4 flex items-start space-x-3`}>
      {style.icon}
      <div className="flex-1">
        {title && <h3 className="font-semibold">{title}</h3>}
        {message && <p className="text-sm">{message}</p>}
      </div>
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </div>
  )
}
