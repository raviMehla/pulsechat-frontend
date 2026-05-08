import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";

// 🟢 Utilizing our standardized UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Frontend Validation
    if (!agreedToTerms) return toast.error("You must agree to the Terms & Conditions.");
    if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match.");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters long.");

    try {
      setIsLoading(true);
      const { confirmPassword, ...registerPayload } = formData;
      
      // 🛡️ ARCHITECTURAL FIX: Pointed to the correct Auth Router mount path
      const response = await api.post("/auth/register", registerPayload);
      
      toast.success(response.data.message || "Registration successful! Please log in.");
      navigate("/login");
      
    } catch (error) {
      console.error("Registration Error:", error);
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-textPrimary p-4">
      <div className="max-w-md w-full bg-surface border border-borderSubtle rounded-2xl shadow-2xl p-8 animate-fadeIn">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-accent mb-2">Create an Account</h1>
          <p className="text-textMuted text-sm">Join PulseChat to start connecting in real-time.</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          
          <Input 
            label="Full Name" 
            name="name"
            value={formData.name} 
            onChange={handleChange} 
            placeholder="John Doe" 
            required 
          />

          <Input 
            label="Username" 
            name="username"
            value={formData.username} 
            onChange={handleChange} 
            placeholder="johndoe123" 
            required 
          />

          <Input 
            label="Email Address" 
            name="email"
            type="email" 
            value={formData.email} 
            onChange={handleChange} 
            placeholder="john@example.com" 
            required 
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Password" 
              name="password"
              type="password" 
              value={formData.password} 
              onChange={handleChange} 
              placeholder="••••••••" 
              required 
            />
            <Input 
              label="Confirm Password" 
              name="confirmPassword"
              type="password" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              placeholder="••••••••" 
              required 
            />
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start gap-3 py-2">
            <input 
              type="checkbox" 
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-borderSubtle bg-background text-accent focus:ring-accent accent-accent cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-textMuted leading-tight cursor-pointer">
              I agree to the <span className="text-accent hover:underline">Terms of Service</span>, <span className="text-accent hover:underline">Privacy Policy</span>, and acknowledge that my data will be securely stored.
            </label>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            variant="primary" 
            className="w-full py-3 mt-2 text-base"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center text-sm text-textMuted border-t border-borderSubtle pt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent font-semibold hover:underline transition-all">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Register;