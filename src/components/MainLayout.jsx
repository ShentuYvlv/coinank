import React from 'react'
import { Box, Container } from '@mui/material'
import Navbar from './Navbar'
import StatsCards from './StatsCards'
import ChartsSection from './ChartsSection'
import TablesSection from './TablesSection'
import LoadingOverlay from './LoadingOverlay'
import ConnectionStatus from './ConnectionStatus'
import { useStore } from '../store/useStore'

function MainLayout() {
  const isLoading = useStore((state) => state.isLoading)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      
      <Container maxWidth={false} sx={{ py: 4 }}>
        <StatsCards />
        <ChartsSection />
        <TablesSection />
      </Container>

      <ConnectionStatus />
      <LoadingOverlay />
    </Box>
  )
}

export default MainLayout