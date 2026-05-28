import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { disconnectSocket } from "../services/socket"; 
import api from "../services/api";
import { useConfirm } from "../hooks/useConfirm";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// 🛡️ API Abstractions
import { requestDataBackup, requestDeletionOtp, deleteAccount } from "../services/user.api";

// 🟢 UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

/* ─────────────────────────────────────────────
   ICON PRIMITIVES
───────────────────────────────────────────── */
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const LifebuoyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
    <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ChevronDown = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ─────────────────────────────────────────────
   SETTINGS CARD — collapsible
───────────────────────────────────────────── */
function SettingsCard({ icon, iconBg, title, description, badge, children, defaultOpen = false, noPadding = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!children;

  return (
    <div
      className="bg-surface rounded-2xl border border-borderSubtle overflow-hidden transition-all duration-200"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.12)" }}
    >
      <button
        type="button"
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors ${hasChildren ? "hover:bg-white/[0.02] cursor-pointer" : "cursor-default"}`}
      >
        {/* Icon chip */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg || "rgba(124,110,247,0.12)" }}
        >
          <span style={{ color: "white", opacity: 0.85 }}>{icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-textPrimary">{title}</span>
            {badge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ background: badge.bg, color: badge.color }}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-xs text-textMuted mt-0.5 truncate">{description}</p>
        </div>

        {hasChildren && (
          <span className="text-textMuted flex-shrink-0">
            <ChevronDown open={open} />
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && children && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className={`border-t border-borderSubtle/60 ${noPadding ? "" : "px-6 py-5"}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN SETTINGS PAGE
───────────────────────────────────────────── */
function Settings() {
  const navigate = useNavigate();
  const { confirmState, confirm, close: closeConfirm } = useConfirm();

  // Loading States
  const [isExporting, setIsExporting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Support Ticket States
  const [supportCategory, setSupportCategory] = useState("Bug Report");
  const [supportDescription, setSupportDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Deletion Pipeline States
  const [deletionPhase, setDeletionPhase] = useState(1);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  // =====================================
  // HANDLERS
  // =====================================
  
  const handleRequestDataBackup = async () => {
    try {
      setIsExporting(true);
      toast.loading("Generating secure backup...", { id: "backup-toast" });

      const data = await requestDataBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `PulseChat_Backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Backup downloaded successfully.", { id: "backup-toast" });
    } catch (error) {
      console.error("Data Export Error:", error);
      toast.error("Failed to generate data backup.", { id: "backup-toast" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogoutAll = () => {
    confirm({
      title: "Log Out All Devices",
      message: "Security Alert: This will immediately log you out of ALL devices, including this one. You will need to log back in. Proceed?",
      confirmText: "Log Out All",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsRevoking(true);
          toast.loading("Revoking global sessions...", { id: "session-toast" });
          await api.post("/users/logout-all");
          toast.success("All sessions secured. Please log in again.", { id: "session-toast" });
          disconnectSocket();
          localStorage.clear();
          sessionStorage.clear();
          navigate("/login");
        } catch (error) {
          console.error("Session Revocation Error:", error);
          toast.error(error.response?.data?.message || "Failed to revoke sessions.", { id: "session-toast" });
          setIsRevoking(false);
        }
      }
    });
  };

  const handleInitiateDeletion = () => {
    confirm({
      title: "Delete Account",
      message: "CRITICAL WARNING: This action will permanently delete your account. Proceed to verification?",
      confirmText: "Delete Account",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsRequestingOtp(true);
          await requestDeletionOtp();
          setDeletionPhase(2);
          toast.success("Verification code sent to your email.", { duration: 5000 });
        } catch (error) {
          console.error("OTP Request Error:", error);
          const errorMessage = error.response?.data?.message || error.message || "Failed to initiate deletion sequence.";
          toast.error(errorMessage);
        } finally {
          setIsRequestingOtp(false);
        }
      }
    });
  };

  const handleConfirmDeletion = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("OTP must be exactly 6 digits.");
    if (password.length < 6) return toast.error("Invalid password length.");
    try {
      setIsDeleting(true);
      toast.loading("Executing safe wipe...", { id: "delete-toast" });
      await deleteAccount(password, otp);
      toast.success("Account permanently deleted.", { id: "delete-toast" });
      disconnectSocket();
      localStorage.clear();
      sessionStorage.clear();
      navigate("/login");
    } catch (error) {
      console.error("Account Deletion Error:", error);
      toast.error(error.response?.data?.message || "Verification failed.", { id: "delete-toast" });
      setIsDeleting(false);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!supportDescription.trim()) {
      return toast.error("Please provide a description for the support ticket.");
    }
    try {
      setIsSubmittingTicket(true);
      toast.loading("Submitting support ticket...", { id: "support-toast" });
      const res = await api.post("/support/ticket", {
        category: supportCategory,
        description: supportDescription.trim()
      });
      toast.success(res.data.message || `Support ticket #${res.data.ticketId} submitted.`, { id: "support-toast" });
      setSupportDescription("");
      setSupportCategory("Bug Report");
    } catch (error) {
      console.error("Support Ticket Error:", error);
      toast.error(error.response?.data?.message || "Failed to submit support ticket.", { id: "support-toast" });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-textPrimary overflow-y-auto custom-scrollbar">

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ minHeight: 120 }}>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0f1a2e 0%, #111118 60%, #0B0B0F 100%)" }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", top: -60, right: 40, background: "radial-gradient(circle, #5DD6B015 0%, transparent 70%)", filter: "blur(30px)" }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 lg:px-10 pt-6 pb-8 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white/90 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white tracking-tight">Advanced Settings</h1>
            <p className="text-xs text-white/40 mt-0.5">Manage sessions, data, support &amp; account</p>
          </div>
        </div>
      </div>

      {/* ── SETTINGS CARDS ── */}
      <div className="max-w-3xl w-full mx-auto px-6 lg:px-10 py-6 flex-1 space-y-4">

        {/* Session Management */}
        <SettingsCard
          icon={<ShieldIcon />}
          iconBg="rgba(251,146,60,0.15)"
          title="Session Management"
          description="Revoke access from all devices simultaneously"
          badge={{ text: "Security", bg: "rgba(251,146,60,0.12)", color: "#fb923c" }}
          defaultOpen={false}
        >
          <p className="text-xs text-textMuted mb-4">
            If you left your account logged in on a shared or public computer, use this to immediately secure your account. You will be logged out of this session too.
          </p>
          <Button
            onClick={handleLogoutAll}
            disabled={isRevoking}
            variant="outline"
            className="border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
          >
            {isRevoking ? "Revoking…" : "Log Out All Devices"}
          </Button>
        </SettingsCard>

        {/* Install App */}
        <SettingsCard
          icon={<PhoneIcon />}
          iconBg="rgba(93,214,176,0.12)"
          title="Mobile Experience"
          description="Install PulseChat to your home screen"
          defaultOpen={false}
        >
          <p className="text-xs text-textMuted mb-4">
            Add PulseChat to your home screen for a full-screen, native-app experience without the browser chrome.
          </p>
          <InstallAppButton />
        </SettingsCard>

        {/* Data Backup */}
        <SettingsCard
          icon={<DownloadIcon />}
          iconBg="rgba(124,110,247,0.12)"
          title="Account Data Backup"
          description="Download your profile, chats & message history"
          defaultOpen={false}
        >
          <p className="text-xs text-textMuted mb-4">
            Export a comprehensive JSON file with your profile data, chat metadata, and message history for your records.
          </p>
          <Button
            onClick={handleRequestDataBackup}
            disabled={isExporting}
            variant="outline"
          >
            {isExporting ? "Compiling Data…" : "Download Backup"}
          </Button>
        </SettingsCard>

        {/* Help & Support */}
        <SettingsCard
          icon={<LifebuoyIcon />}
          iconBg="rgba(56,189,248,0.12)"
          title="Help & Support"
          description="Submit a bug report or feature request"
          defaultOpen={false}
          noPadding
        >
          <form onSubmit={handleSubmitTicket} className="px-6 py-5 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-textMuted mb-1.5 block">Category</label>
              <select
                value={supportCategory}
                onChange={(e) => setSupportCategory(e.target.value)}
                className="w-full bg-background border border-borderSubtle rounded-xl py-2.5 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors"
              >
                <option value="Bug Report">🐛 Bug Report</option>
                <option value="Account Issue">🔐 Account Issue</option>
                <option value="Feature Request">✨ Feature Request</option>
                <option value="Other">💬 Other</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-textMuted mb-1.5 block">Description</label>
              <textarea
                value={supportDescription}
                onChange={(e) => setSupportDescription(e.target.value)}
                rows="3"
                placeholder="Describe your issue or request in detail…"
                className="w-full bg-background border border-borderSubtle rounded-xl py-2.5 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors resize-none placeholder-textMuted/40"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmittingTicket} variant="primary" className="w-full">
              {isSubmittingTicket ? "Submitting…" : "Submit Ticket"}
            </Button>
          </form>
        </SettingsCard>

        {/* Danger Zone */}
        <div
          className="rounded-2xl border border-danger/25 overflow-hidden"
          style={{ background: "rgba(239,68,68,0.04)" }}
        >
          <div className="flex items-center gap-4 px-6 py-4 border-b border-danger/15">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <span className="text-danger"><AlertTriangleIcon /></span>
            </div>
            <div>
              <span className="text-sm font-semibold text-danger">Danger Zone</span>
              <p className="text-xs text-textMuted mt-0.5">Permanent and irreversible account actions</p>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs text-textMuted mb-4">
              Permanently delete your account. This will remove your presence from all group chats and scrub your metadata from our servers. <strong className="text-danger/80">This cannot be undone.</strong>
            </p>

            <AnimatePresence mode="wait">
              {deletionPhase === 1 ? (
                <motion.div key="phase1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button
                    onClick={handleInitiateDeletion}
                    disabled={isRequestingOtp}
                    variant="danger"
                  >
                    {isRequestingOtp ? "Initiating…" : "Delete Account"}
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="phase2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleConfirmDeletion}
                  className="space-y-4 bg-surface p-5 rounded-xl border border-danger/25"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-danger">Final Verification Required</h4>
                    <p className="text-xs text-textMuted mt-1">Enter your password and the 6-digit code sent to your email.</p>
                  </div>
                  <Input
                    type="password"
                    label="Current Password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Input
                    type="text"
                    label="Verification Code"
                    placeholder="6-Digit OTP"
                    required
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={isDeleting} variant="danger" className="flex-1">
                      {isDeleting ? "Wiping Account…" : "Confirm Deletion"}
                    </Button>
                    <Button type="button" onClick={() => setDeletionPhase(1)} disabled={isDeleting} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfirmDialog {...confirmState} onClose={closeConfirm} />
    </div>
  );
}

export default Settings;

/* ─────────────────────────────────────────────
   PWA INSTALL BUTTON
───────────────────────────────────────────── */
export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") console.log("App Installed!");
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) {
    return (
      <Button disabled variant="outline" className="opacity-50 cursor-not-allowed">
        📱 App already installed or browser unsupported
      </Button>
    );
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      className="border-accent text-accent hover:bg-accent hover:text-white"
    >
      📱 Install PulseChat to Home Screen
    </Button>
  );
}