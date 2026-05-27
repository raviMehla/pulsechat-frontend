import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { sendRegistrationOtp, verifyRegistrationOtp, registerUser } from "../services/auth.api";

import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

// ─────────────────────────────────────────────
// OTP Input — 6 individual digit boxes
// ─────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleChange = (e, index) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const newOtp = value.split("");
    newOtp[index] = char;
    const updated = newOtp.join("").padEnd(6, "").slice(0, 6);
    onChange(updated);
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2.5 my-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={`w-11 h-13 text-center text-xl font-bold rounded-lg border-2 bg-surface text-textPrimary outline-none transition-all duration-200
            ${value[i]
              ? "border-accent shadow-[0_0_0_2px_rgba(124,110,247,0.25)]"
              : "border-borderSubtle focus:border-accent focus:shadow-[0_0_0_2px_rgba(124,110,247,0.2)]"
            }`}
          style={{ width: "44px", height: "52px" }}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Resend Timer
// ─────────────────────────────────────────────
function ResendTimer({ onResend, isLoading }) {
  const [seconds, setSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    setSeconds(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = () => {
    setSeconds(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    onResend();
  };

  return (
    <p className="text-center text-xs text-textMuted mt-3">
      {canResend ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={isLoading}
          className="text-accent font-semibold hover:underline transition-all disabled:opacity-50"
        >
          Resend verification code
        </button>
      ) : (
        <>Resend code in <span className="text-accent font-semibold tabular-nums">{seconds}s</span></>
      )}
    </p>
  );
}

// ─────────────────────────────────────────────
// Step Indicator
// ─────────────────────────────────────────────
function StepIndicator({ currentStep }) {
  const steps = [
    { n: 1, label: "Email" },
    { n: 2, label: "Verify" },
    { n: 3, label: "Details" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                currentStep > step.n
                  ? "bg-accent border-accent text-white"
                  : currentStep === step.n
                  ? "bg-accent/10 border-accent text-accent"
                  : "bg-transparent border-borderSubtle text-textMuted"
              }`}
            >
              {currentStep > step.n ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                step.n
              )}
            </div>
            <span
              className={`text-xs mt-1 font-medium transition-all duration-300 ${
                currentStep >= step.n ? "text-accent" : "text-textMuted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-12 mb-4 mx-1 rounded transition-all duration-500 ${
                currentStep > step.n ? "bg-accent" : "bg-borderSubtle"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Register Component
// ─────────────────────────────────────────────
function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1
  const [email, setEmail] = useState("");

  // Step 2
  const [otp, setOtp] = useState("");
  const [emailVerifiedToken, setEmailVerifiedToken] = useState("");

  // Step 3
  const [formData, setFormData] = useState({ name: "", username: "", password: "", confirmPassword: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Step 1: Send OTP ──
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email.trim()) return toast.error("Please enter your email address.");

    try {
      setIsLoading(true);
      const res = await sendRegistrationOtp(email.trim().toLowerCase());
      toast.success(res.message || "Verification code sent!");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.replace(/\s/g, "").length < 6) return toast.error("Please enter the complete 6-digit code.");

    try {
      setIsLoading(true);
      const res = await verifyRegistrationOtp(email.trim().toLowerCase(), otp.trim());
      setEmailVerifiedToken(res.emailVerifiedToken);
      toast.success("Email verified! Complete your profile below.");
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired code. Please try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Create Account ──
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) return toast.error("You must agree to the Terms & Conditions.");
    if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match.");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters long.");

    try {
      setIsLoading(true);
      await registerUser({
        name: formData.name,
        username: formData.username,
        password: formData.password,
        emailVerifiedToken,
      });
      toast.success("Account created! Welcome to PulseChat 🎉");
      navigate("/login");
    } catch (error) {
      const msg = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(msg);
      // If token expired, push back to step 1
      if (msg.toLowerCase().includes("verif") || msg.toLowerCase().includes("token")) {
        setStep(1);
        setOtp("");
        setEmailVerifiedToken("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = [
    { title: "Create an Account", subtitle: "Enter your email to get started." },
    { title: "Verify Your Email", subtitle: `We sent a 6-digit code to ${email || "your email"}.` },
    { title: "Complete Your Profile", subtitle: "Almost there! Set up your account details." },
  ];

  const { title, subtitle } = stepTitles[step - 1];

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background text-textPrimary p-4">
      <div className="max-w-md w-full bg-surface border border-borderSubtle rounded-2xl shadow-2xl p-8 animate-fadeIn">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-accent mb-1">{title}</h1>
          <p className="text-textMuted text-sm">{subtitle}</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-5">
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
              className="w-full py-3 mt-2 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Sending code...
                </span>
              ) : (
                "Send Verification Code →"
              )}
            </Button>
          </form>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textMuted mb-3 text-center">
                Enter the 6-digit code
              </label>
              <OtpInput value={otp} onChange={setOtp} />
              <ResendTimer onResend={handleSendOtp} isLoading={isLoading} />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 mt-2 text-base"
              disabled={isLoading || otp.replace(/\D/g, "").length < 6}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify & Continue →"
              )}
            </Button>

            <button
              type="button"
              onClick={() => { setStep(1); setOtp(""); }}
              className="w-full text-center text-xs text-textMuted hover:text-textPrimary transition-all mt-1"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {/* ── Step 3: Account Details ── */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Verified email badge */}
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="text-xs text-accent font-medium truncate">{email}</span>
              <span className="text-xs text-textMuted ml-auto shrink-0">Verified ✓</span>
            </div>

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

            {/* Terms */}
            <div className="flex items-start gap-3 py-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-borderSubtle bg-background text-accent focus:ring-accent accent-accent cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-textMuted leading-tight cursor-pointer">
                I agree to the{" "}
                <span className="text-accent hover:underline">Terms of Service</span>,{" "}
                <span className="text-accent hover:underline">Privacy Policy</span>, and acknowledge that my data will be securely stored.
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 mt-1 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                "Create My Account 🚀"
              )}
            </Button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-7 text-center text-sm text-textMuted border-t border-borderSubtle pt-5">
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