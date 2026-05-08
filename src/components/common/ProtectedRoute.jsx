import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    // 🛡️ ARCHITECTURAL UPGRADE: Redirect unauthenticated users to the new Front Door
    // The 'replace' prop ensures this redirect doesn't clutter their browser history
    return <Navigate to="/landing" replace />;
  }

  return children;
}

export default ProtectedRoute;