import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { disconnectSocket } from "../services/socket"; 
import api from "../services/api"; // 🛡️ ARCHITECTURAL UPGRADE: Imported for Session Management

// 🛡️ API Abstractions
import { requestDataBackup, requestDeletionOtp, deleteAccount } from "../services/user.api";

// 🟢 UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

function Settings() {
  const navigate = useNavigate();

  // Loading States
  const [isExporting, setIsExporting] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false); // 🛡️ New State for Sessions

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
      link.download = `PulseChat_Backup_${new Date().toISOString().split('T')[0]}.json`;
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

  // 🛡️ ARCHITECTURAL UPGRADE: Session Revocation Logic
  const handleLogoutAll = async () => {
    if (!window.confirm("Security Alert: This will immediately log you out of ALL devices, including this one. You will need to log back in. Proceed?")) return;

    try {
      setIsRevoking(true);
      toast.loading("Revoking global sessions...", { id: "session-toast" });

      // Ping the backend to increment tokenVersion
      // Update this route string if your backend router uses a different path!
      await api.post("/users/logout-all"); 

      toast.success("All sessions secured. Please log in again.", { id: "session-toast" });
      
      // Execute local cleanup
      disconnectSocket(); 
      localStorage.clear();    
      sessionStorage.clear();   
      navigate("/login"); 

    } catch (error) {
      console.error("Session Revocation Error:", error);
      toast.error(error.response?.data?.message || "Failed to revoke sessions.", { id: "session-toast" });
      setIsRevoking(false);
    }
  };

  const handleInitiateDeletion = async () => {
    if (!window.confirm("CRITICAL WARNING: This action will permanently delete your account. Proceed to verification?")) return;

    try {
      setIsRequestingOtp(true);
      await requestDeletionOtp();
      setDeletionPhase(2); 
      toast.success("Verification code sent to your email.", { duration: 5000 });
    } catch (error) {
      console.error("OTP Request Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to initiate deletion sequence. Network timeout.";
      toast.error(errorMessage);
    } finally {
      setIsRequestingOtp(false);
    }
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
      
      // Secure Cleanup Pipeline
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

  return (
    <div className="h-full flex flex-col bg-background text-textPrimary overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl w-full mx-auto p-6 lg:p-10 flex-1 animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate("/")} variant="ghost" className="!px-2 !py-1 text-2xl" title="Back to Platform">
            ←
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Settings</h1>
        </div>

        <div className="space-y-8">
          
          {/* --- SESSION MANAGEMENT SECTION --- */}
          <div className="bg-surface p-6 rounded-xl border border-borderSubtle shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Session Management</h3>
            <p className="text-sm text-textMuted mb-6">
              Log out of all devices globally. If you left your account logged in on a shared or public computer, use this to secure your account immediately.
            </p>
            <Button 
              onClick={handleLogoutAll}
              disabled={isRevoking}
              variant="outline"
              className="border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
            >
              {isRevoking ? "Revoking..." : "Log Out All Devices"}
            </Button>
          </div>

          <div className="bg-surface p-6 rounded-xl border border-borderSubtle shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Mobile Experience</h3>
            <p className="text-sm text-textMuted mb-6">
              Install PulseChat directly to your device's home screen for a full-screen, native app experience.
            </p>
            <InstallAppButton />
          </div>

          {/* --- DATA EXPORT SECTION --- */}
          <div className="bg-surface p-6 rounded-xl border border-borderSubtle shadow-sm">
            <h3 className="text-lg font-semibold mb-1">Account Data Backup</h3>
            <p className="text-sm text-textMuted mb-6">
              Download a comprehensive JSON file containing your profile data, chat metadata, and message history.
            </p>
            <Button 
              onClick={handleRequestDataBackup}
              disabled={isExporting}
              variant="outline"
            >
              {isExporting ? "Compiling Data..." : "Download Backup"}
            </Button>
          </div>

          {/* --- ACCOUNT DELETION SECTION --- */}
          <div className="bg-danger/5 p-6 rounded-xl border border-danger/20 shadow-sm">
            <h3 className="text-lg font-semibold text-danger mb-1">Danger Zone</h3>
            <p className="text-sm text-textMuted mb-6">
              Permanently delete your account. This will remove your presence from all group chats and scrub your metadata from our servers.
            </p>
            
            {deletionPhase === 1 ? (
              <Button 
                onClick={handleInitiateDeletion}
                disabled={isRequestingOtp}
                variant="danger"
              >
                {isRequestingOtp ? "Initiating..." : "Delete Account"}
              </Button>
            ) : (
              <form onSubmit={handleConfirmDeletion} className="space-y-4 mt-6 bg-surface p-5 rounded-lg border border-danger/30 animate-fadeIn">
                <h4 className="text-sm font-semibold text-danger">Final Verification Required</h4>
                <p className="text-xs text-textMuted mb-4">Please enter your password and the 6-digit code sent to your email.</p>
                
                <Input 
                  type="password" placeholder="Current Password" required 
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <Input 
                  type="text" placeholder="6-Digit OTP" required maxLength="6"
                  value={otp} onChange={(e) => setOtp(e.target.value)}
                />
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isDeleting} variant="danger" className="flex-1">
                    {isDeleting ? "Wiping Account..." : "Confirm Deletion"}
                  </Button>
                  <Button type="button" onClick={() => setDeletionPhase(1)} disabled={isDeleting} variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Settings;

/// 🛡️ UPGRADED: The PWA Install Button Logic
export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("PWA criteria met! Install prompt ready.");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('App Installed!');
    }
    setDeferredPrompt(null);
  };

  // 🛡️ FIX: Instead of returning null, show a helpful status!
  if (!deferredPrompt) {
    return (
      <Button disabled variant="outline" className="w-full opacity-50 cursor-not-allowed">
        📱 App already installed or browser unsupported
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleInstallClick} 
      variant="outline"
      className="w-full border-accent text-accent hover:bg-accent hover:text-white"
    >
      📱 Install PulseChat to Home Screen
    </Button>
  );
}