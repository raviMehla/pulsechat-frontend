import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { forgotPassword, resetPassword } from "../services/auth.api";

// 🟢 Utilizing our standardized UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email address.");

    try {
      setIsLoading(true);
      const res = await forgotPassword(email.trim());
      toast.success(res.message || "Reset code sent successfully.");
      setStep(2);
    } catch (error) {
      console.error("Forgot password request error:", error);
      toast.error(error.response?.data?.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return toast.error("Please enter the verification code.");
    if (!newPassword.trim()) return toast.error("Please enter your new password.");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match.");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.");

    try {
      setIsLoading(true);
      const res = await resetPassword(email.trim(), otp.trim(), newPassword);
      toast.success(res.message || "Password reset successfully. Please log in.");
      navigate("/login");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error.response?.data?.message || "Invalid or expired code.");
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
               <span className="text-3xl">🔑</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-accent mb-2">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h1>
          <p className="text-textMuted text-sm">
            {step === 1 
              ? "Enter your email address to receive a password reset verification code."
              : `Enter the code sent to ${email} and your new password.`
            }
          </p>
        </div>

        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <Input 
              label="Email Address" 
              name="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="john@example.com" 
              required 
            />

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-3 mt-4 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {/* Step 2: Input OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <Input 
              label="Verification Code (OTP)" 
              name="otp"
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              placeholder="123456" 
              maxLength={6}
              required 
            />

            <Input 
              label="New Password" 
              name="newPassword"
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />

            <Input 
              label="Confirm New Password" 
              name="confirmPassword"
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />

            <div className="flex justify-between items-center text-xs mt-2">
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="text-textMuted hover:text-textPrimary transition-all"
              >
                ← Back to Email
              </button>
              <button 
                type="button" 
                onClick={handleRequestOtp}
                disabled={isLoading}
                className="text-accent hover:underline font-medium"
              >
                Resend Code
              </button>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-3 mt-4 text-base"
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        )}

        {/* Footer Link to Login */}
        <div className="mt-8 text-center text-sm text-textMuted border-t border-borderSubtle pt-6">
          Remembered your password?{" "}
          <Link to="/login" className="text-accent font-semibold hover:underline transition-all">
            Sign In Here
          </Link>
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;
