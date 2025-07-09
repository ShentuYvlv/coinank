import React from 'react'
import { Alert, Snackbar, Slide } from '@mui/material'
import { useStore } from '../store/useStore'

function SlideTransition(props) {
  return <Slide {...props} direction="up" />
}

const ConnectionStatus = () => {
  const { connectionStatus, isConnected } = useStore()
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [severity, setSeverity] = React.useState('info')
  
  React.useEffect(() => {
    if (connectionStatus === 'connected') {
      setMessage('已连接到实时数据源')
      setSeverity('success')
      setOpen(true)
    } else if (connectionStatus === 'disconnected') {
      setMessage('与数据源的连接已断开')
      setSeverity('error')
      setOpen(true)
    } else if (connectionStatus === 'reconnecting') {
      setMessage('正在重新连接...')
      setSeverity('warning')
      setOpen(true)
    }
  }, [connectionStatus])
  
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }
  
  return (
    <Snackbar
      open={open}
      autoHideDuration={connectionStatus === 'connected' ? 3000 : null}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Alert 
        onClose={handleClose} 
        severity={severity} 
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export default ConnectionStatus