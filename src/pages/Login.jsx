import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";

// 🟢 Utilizing our standardized UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const response = await api.post("/auth/login", formData);
      
      const token = response.data.token;
      const userPayload = response.data.user || response.data;
      
      // 🛡️ ARCHITECTURAL FIX: Support both serialized 'id' and raw MongoDB '_id'
      const rawUserId = userPayload.id || userPayload._id;

      if (!rawUserId || !token) {
        throw new Error("Malformed authentication payload from server");
      }

      // Store the exact 24-character string securely
      localStorage.setItem("userId", String(rawUserId)); 
      localStorage.setItem("user", JSON.stringify(userPayload));
      localStorage.setItem("token", token);
      
      toast.success("Welcome back!");
      navigate("/"); // This will now execute successfully
      
    } catch (error) {
      console.error("Login Error:", error); 
      
      // 🛡️ ARCHITECTURAL UPGRADE: Dynamic UX based on backend status codes
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || "An unexpected error occurred.";

      if (status === 404 || status === 403) {
        // 404: Not Found, 403: Deleted/Forbidden
        toast.error(errorMessage, { duration: 5000 });
      } else if (status === 400 && errorMessage.toLowerCase().includes("password")) {
        // 400: Incorrect Password
        toast.error(errorMessage);
        // Clean UX: Erase the password so they can try again, keeping the identifier
        setFormData(prev => ({ ...prev, password: "" }));
      } else {
        // Fallback for generic errors
        toast.error(errorMessage || "Invalid credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-textPrimary p-4">
      <div className="max-w-md w-full bg-surface border border-borderSubtle rounded-2xl shadow-2xl p-8 animate-fadeIn">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-background rounded-2xl border border-borderSubtle shadow-inner flex items-center justify-center">
               <span className="text-3xl">💬</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-accent mb-2">Welcome Back</h1>
          <p className="text-textMuted text-sm">Sign in to continue to PulseChat.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
         <Input 
            label="Email or Username" 
            name="identifier"
            type="text" 
            value={formData.identifier} 
            onChange={handleChange} 
            placeholder="john@example.com" 
            required 
          />

          <Input 
            label="Password" 
            name="password"
            type="password" 
            value={formData.password} 
            onChange={handleChange} 
            placeholder="••••••••" 
            required 
          />

          {/* Submit Button */}
          <Button 
            type="submit" 
            variant="primary" 
            className="w-full py-3 mt-4 text-base"
            disabled={isLoading}
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </Button>
        </form>

        {/* Footer Link to Registration */}
        <div className="mt-8 text-center text-sm text-textMuted border-t border-borderSubtle pt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-accent font-semibold hover:underline transition-all">
            Create one here
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;