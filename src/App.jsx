
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import Home from './pages/Home'
import PendingApproval from './pages/PendingApproval'
import NewAd from './pages/NewAd'
import MyAds from './pages/MyAds'
import MyRequests from './pages/MyRequests' // Imported
import Relatorio from './pages/Relatorio' // Imported
import ManageUsers from './pages/ManageUsers'
import PendingAds from './pages/PendingAds'
import { AuthProvider } from './contexts/AuthContext'

import DashboardLayout from './layouts/DashboardLayout'
import Explore from './pages/Explore'
import ReturnProcess from './pages/ReturnProcess'
import ForgotPassword from './pages/ForgotPassword'
import UpdatePassword from './pages/UpdatePassword'
import AdDetails from './pages/AdDetails'
import LandingPage from './pages/LandingPage'
import Financial from './pages/Financial'
import { HelmetProvider } from 'react-helmet-async'

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            <Route path="/anuncio/:id" element={
              <DashboardLayout>
                <AdDetails />
              </DashboardLayout>
            } />

            <Route path="/pending-approval" element={
              <DashboardLayout>
                <PendingApproval />
              </DashboardLayout>
            } />

            <Route path="/novo-anuncio" element={
              <DashboardLayout>
                <NewAd />
              </DashboardLayout>
            } />

            <Route path="/meus-anuncios" element={
              <DashboardLayout>
                <MyAds />
              </DashboardLayout>
            } />

            <Route path="/minhas-solicitacoes" element={
              <DashboardLayout>
                <MyRequests />
              </DashboardLayout>
            } />

            <Route path="/relatorio" element={
              <DashboardLayout>
                <Relatorio />
              </DashboardLayout>
            } />

            <Route path="/devolver/:id" element={
              <DashboardLayout>
                <ReturnProcess />
              </DashboardLayout>
            } />

            <Route path="/equipe" element={
              <DashboardLayout>
                <ManageUsers />
              </DashboardLayout>
            } />

            <Route path="/pending-ads" element={
              <DashboardLayout>
                <PendingAds />
              </DashboardLayout>
            } />

            <Route path="/dashboard" element={
              <DashboardLayout>
                <Home />
              </DashboardLayout>
            } />

            <Route path="/explorar" element={
              <DashboardLayout>
                <Explore />
              </DashboardLayout>
            } />

            <Route path="/" element={<LandingPage />} />

            <Route path="/financeiro" element={
              <DashboardLayout>
                <Financial />
              </DashboardLayout>
            } />
            <Route path="*" element={<Navigate to="/signin" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App
