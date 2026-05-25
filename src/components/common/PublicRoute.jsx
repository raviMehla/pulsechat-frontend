import { Navigate } from "react-router-dom";

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    // 🛡️ Redirect authenticated users to the platform root instantly
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicRoute;
