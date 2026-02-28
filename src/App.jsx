import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import WorkspaceDashboard from './pages/WorkspaceDashboard';
import CreateWorkspace from './pages/CreateWorkspace';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TeamMembers from './pages/TeamMembers';
import WorkspaceSettings from './pages/WorkspaceSettings';
import StructuralInput from './pages/StructuralInput';
import ProjectSetup from './pages/ProjectSetup';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LoadingProvider>
          <WorkspaceProvider>
            <BrowserRouter>
              <div className="min-h-screen w-full bg-white dark:bg-[#111827] transition-colors duration-300">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  
                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workspace/create" element={
                    <ProtectedRoute>
                      <CreateWorkspace />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workspace/:workspaceId" element={
                    <ProtectedRoute>
                      <WorkspaceDashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workspace/:workspaceId/projects" element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workspace/:workspaceId/projects/:projectId" element={
                    <ProtectedRoute>
                      <ProjectDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workspace/:workspaceId/members" element={
                    <ProtectedRoute>
                      <TeamMembers />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/workspace/:workspaceId/settings" element={
                    <ProtectedRoute>
                      <WorkspaceSettings />
                    </ProtectedRoute>
                  } />
                 
                    <Route 
                      path="/workspace/:workspaceId/projects/:projectId/slab-input" 
                      element={
                        <ProtectedRoute>
                          <StructuralInput />    
                        </ProtectedRoute>
                      } 
                    />
                  
                                  <Route 
                    path="/workspace/:workspaceId/projects/new" 
                    element={
                      <ProtectedRoute>
                        <ProjectSetup />
                      </ProtectedRoute>
                    } 
/> 
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </BrowserRouter>
          </WorkspaceProvider>
        </LoadingProvider>
      </AuthProvider>  
    </ThemeProvider>
  );
}

export default App;