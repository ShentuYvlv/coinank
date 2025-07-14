import React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SnackbarProvider } from 'notistack'
import MainLayout from './components/MainLayout'
import { useStore } from './store/useStore'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
    },
    secondary: {
      main: '#00ff88',
    },
    warning: {
      main: '#ffb800',
    },
    error: {
      main: '#ff4757',
    },
    background: {
      default: '#1a1d29',
      paper: '#252836',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b8bcc8',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "SF Pro Display", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #3a3f51',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #3a3f51',
          borderRadius: '0.5rem',
          boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.375rem',
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
})

function App() {
  const initializeApp = useStore((state) => state.initializeApp)
  const switchToken = useStore((state) => state.switchToken)

  React.useEffect(() => {
    // 检查 URL 参数
    const urlParams = new URLSearchParams(window.location.search)
    const basecoin = urlParams.get('basecoin')

    if (basecoin) {
      console.log(`🔗 从URL参数加载代币: ${basecoin}`)
      // 先初始化应用，然后切换代币
      initializeApp().then(() => {
        switchToken(basecoin.toUpperCase()).catch(error => {
          console.error('URL参数代币加载失败:', error)
          // 如果URL参数的代币无效，回退到默认代币
          initializeApp()
        })
      })
    } else {
      initializeApp()
    }
  }, [initializeApp, switchToken])

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MainLayout />
      </SnackbarProvider>
    </ThemeProvider>
  )
}

export default App