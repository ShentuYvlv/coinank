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

    const initializeWithToken = async () => {
      try {
        // 等待一小段时间，确保Zustand persist完全恢复状态
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log('🔍 App.jsx初始化检查:', {
          hasBasecoin: !!basecoin,
          basecoinValue: basecoin,
          localStorage: {
            hasZustandStorage: !!localStorage.getItem('coinank-storage')
          }
        })
        
    if (basecoin) {
      console.log(`🔗 从URL参数加载代币: ${basecoin}`)
          
          // 先初始化应用
          await initializeApp()
          
          // 然后尝试切换到URL指定的代币
          try {
            await switchToken(basecoin.toUpperCase())
            console.log(`✅ 成功从URL参数切换到代币: ${basecoin}`)
          } catch (switchError) {
            console.error('URL参数代币切换失败:', switchError)
            // 如果URL参数的代币无效，已经有默认数据，不需要重新初始化
            console.log('🔄 保持默认代币状态')
          }
    } else {
          // 没有URL参数，正常初始化
          await initializeApp()
    }
      } catch (initError) {
        console.error('应用初始化失败:', initError)
        // 即使初始化失败，也要确保基本的应用状态
      }
    }

    initializeWithToken()
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