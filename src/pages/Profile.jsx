import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { disconnectSocket } from "../services/socket";
import { useConfirm } from "../hooks/useConfirm";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// 🛡️ ARCHITECTURAL FIX: Importing all modular API functions
import { 
  updateUserProfile, 
  updatePassword, 
  logoutAllDevices, 
  toggleBlockUser,
  getMyProfile,
  updatePrivacy
} from "../services/user.api";

// 🟢 UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar"; 

/* ─────────────────────────────────────────────
   EDIT PENCIL ICON
───────────────────────────────────────────── */
const PencilIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const LockIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const UserIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CameraIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

/* ─────────────────────────────────────────────
   INFO ROW — Read-only field display
───────────────────────────────────────────── */
const InfoRow = ({ label, value, locked = false }) => (
  <div className="flex flex-col gap-0.5 py-3 border-b border-borderSubtle/50 last:border-0">
    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-textMuted">{label}</span>
    <div className="flex items-center gap-2">
      {locked && <span className="text-textMuted opacity-50"><LockIcon size={12} /></span>}
      <span className={`text-sm font-medium ${locked ? "text-textMuted" : "text-textPrimary"}`}>
        {value || <span className="text-textMuted italic text-xs">Not provided</span>}
      </span>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   PRIVACY SELECT ROW
───────────────────────────────────────────── */
const PrivacyRow = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4 py-4 border-b border-borderSubtle/50 last:border-0">
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <span className="text-sm font-semibold text-textPrimary">{label}</span>
      <span className="text-xs text-textMuted">{description}</span>
    </div>
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="appearance-none border border-borderSubtle rounded-lg text-xs font-semibold px-3 py-2 outline-none focus:border-accent transition-all disabled:opacity-50 cursor-pointer hover:border-accent/50 flex-shrink-0"
      style={{
        minWidth: 110,
        background: "#1A1A22",
        color: "#F0EFF8",
        WebkitAppearance: "none",
        MozAppearance: "none",
      }}
    >
      <option value="everyone" style={{ background: "#1A1A22", color: "#F0EFF8" }}>Everyone</option>
      <option value="contacts" style={{ background: "#1A1A22", color: "#F0EFF8" }}>Contacts</option>
      <option value="nobody" style={{ background: "#1A1A22", color: "#F0EFF8" }}>Nobody</option>
    </select>
  </div>
);

/* ─────────────────────────────────────────────
   MAIN PROFILE PAGE
───────────────────────────────────────────── */
function Profile() {
  const navigate = useNavigate();
  const { confirmState, confirm, close: closeConfirm } = useConfirm();
  
  const userString = localStorage.getItem("user");
  const initialUser = userString ? JSON.parse(userString) : {};

  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form States
  const [formData, setFormData] = useState({ 
    name: initialUser.name || "", 
    bio: initialUser.bio || "" 
  });
  // Draft — holds in-progress edits separately, reverts on cancel
  const [draftData, setDraftData] = useState({ name: initialUser.name || "", bio: initialUser.bio || "" });

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  // Image Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialUser.profilePic || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const freshUser = await getMyProfile();
        setUser(freshUser);
        localStorage.setItem("user", JSON.stringify(freshUser));
        const newFormData = {
          name: freshUser.name || "",
          bio: freshUser.bio || ""
        };
        setFormData(newFormData);
        setDraftData(newFormData);
        setPreviewUrl(freshUser.profilePic || null);
      } catch (error) {
        console.error("Failed to fetch fresh profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // ==========================================
  // HANDLERS
  // ==========================================
  
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select a valid image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be less than 5MB.");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleEnterEdit = () => {
    setDraftData({ ...formData });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setDraftData({ ...formData });
    setPreviewUrl(user.profilePic || null);
    setSelectedFile(null);
    setIsEditMode(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const submitData = new FormData();
      submitData.append("name", draftData.name);
      submitData.append("bio", draftData.bio);
      if (selectedFile) {
        submitData.append("profilePic", selectedFile);
      }

      const resData = await updateUserProfile(submitData);
      
      const updatedUser = resData.user || resData;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      const newFormData = { name: updatedUser.name || "", bio: updatedUser.bio || "" };
      setFormData(newFormData);
      setDraftData(newFormData);
      setSelectedFile(null);
      setIsEditMode(false);
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Profile Update Error:", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const resData = await updatePassword(passwords);
      toast.success(resData.message || "Password updated");
      setPasswords({ currentPassword: "", newPassword: "" });
      if (resData.token) localStorage.setItem("token", resData.token);
    } catch (error) {
      console.error("Password Update Error:", error);
      toast.error(error.response?.data?.message || "Password update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAll = () => {
    confirm({
      title: "Log Out Everywhere",
      message: "Are you sure you want to log out of every active session, including this browser?",
      confirmText: "Log Out All",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await logoutAllDevices();
          toast.success("All sessions logged out.");
          executeLogout();
        } catch (error) {
          console.error("Global Logout Error:", error); 
          toast.error("Action failed");
        }
      }
    });
  };

  const handleUnblock = async (targetId) => {
    try {
      const resData = await toggleBlockUser(targetId);
      toast.success(resData.message || "User unblocked");
      setUser(prev => {
        const updatedUser = {
          ...prev, 
          blockedUsers: prev.blockedUsers.filter(u => (u._id || u) !== targetId)
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });
    } catch (error) {
      console.error("Unblock User Error:", error);
      toast.error("Failed to unblock user");
    }
  };

  const handlePrivacyUpdate = async (field, value) => {
    setIsLoading(true);
    try {
      await updatePrivacy({ [field]: value });
      toast.success("Privacy settings updated");
      setUser(prev => {
        const updatedUser = {
          ...prev,
          privacy: { ...prev?.privacy, [field]: value }
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });
    } catch (error) {
      console.error("Privacy Update Error:", error);
      toast.error(error.response?.data?.message || "Failed to update privacy settings");
    } finally {
      setIsLoading(false);
    }
  };

  const executeLogout = () => {
    disconnectSocket();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  const tabs = [
    { id: "general", label: "General", icon: <UserIcon size={13} /> },
    { id: "security", label: "Security", icon: <LockIcon size={13} /> },
    { id: "privacy", label: "Privacy", icon: <ShieldIcon size={13} /> },
  ];

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="h-full flex flex-col bg-background text-textPrimary overflow-y-auto custom-scrollbar">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ minHeight: 200 }}>
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1a1040 0%, #0f1a2e 40%, #0B0B0F 100%)",
          }}
        />
        {/* Subtle mesh blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", top: -80, left: -60, background: "radial-gradient(circle, #7C6EF730 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", top: -30, right: 0, background: "radial-gradient(circle, #5DD6B018 0%, transparent 70%)", filter: "blur(40px)" }} />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 lg:px-10 pt-6 pb-8 flex items-end gap-6">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="absolute top-5 left-6 lg:left-10 flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white/90 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>

          {/* Avatar area */}
          <div
            className="relative group cursor-pointer mt-10"
            style={{
              width: 88,
              height: 88,
              flexShrink: 0,
              borderRadius: "50%",
              boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 0 24px rgba(124,110,247,0.2)",
            }}
          >
            <Avatar
              src={previewUrl}
              alt={formData.name || "User"}
              size="xxl"
              className="transition-opacity group-hover:opacity-80"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/50"
            >
              <div className="flex flex-col items-center gap-0.5">
                <CameraIcon size={16} />
                <span className="text-white text-[9px] font-semibold">Change</span>
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/jpeg, image/png, image/webp"
              className="hidden"
            />
          </div>

          {/* Name + username */}
          <div className="flex flex-col gap-1 pb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
              {formData.name || "Your Name"}
            </h1>
            {user?.username && (
              <span className="text-sm text-white/50 font-medium">@{user.username}</span>
            )}
            {user?.bio && (
              <p className="text-xs text-white/40 mt-0.5 max-w-xs line-clamp-1">{user.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="border-b border-borderSubtle bg-surface/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (isEditMode) handleCancelEdit(); }}
              className={`flex items-center gap-1.5 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-textMuted hover:text-textPrimary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-3xl w-full mx-auto px-6 lg:px-10 py-8 flex-1">
        
        {/* ════ GENERAL TAB ════ */}
        <AnimatePresence mode="wait">
          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Profile Info Card */}
              <div className="bg-surface rounded-2xl border border-borderSubtle overflow-hidden">
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-borderSubtle/60">
                  <div>
                    <h3 className="text-sm font-semibold text-textPrimary">Profile Information</h3>
                    <p className="text-xs text-textMuted mt-0.5">
                      {isEditMode ? "Editing your profile details" : "Your public-facing profile details"}
                    </p>
                  </div>
                  {!isEditMode ? (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleEnterEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: "rgba(124,110,247,0.1)",
                        border: "1px solid rgba(124,110,247,0.25)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      <PencilIcon size={12} />
                      Edit Profile
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-textMuted hover:text-textPrimary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-6 py-2">
                  <AnimatePresence mode="wait">
                    {!isEditMode ? (
                      /* ── READ-ONLY VIEW ── */
                      <motion.div
                        key="readonly"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <InfoRow label="Display Name" value={formData.name} />
                        <InfoRow label="Username" value={user?.username ? `@${user.username}` : null} locked />
                        <InfoRow label="Email Address" value={user?.email} locked />
                        <InfoRow label="Phone Number" value={user?.phone} locked />
                        <InfoRow label="Bio" value={formData.bio || "No bio set yet."} />
                      </motion.div>
                    ) : (
                      /* ── EDIT MODE ── */
                      <motion.form
                        key="editmode"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleProfileUpdate}
                        className="py-4 space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Display Name"
                            value={draftData.name}
                            onChange={(e) => setDraftData({ ...draftData, name: e.target.value })}
                            required
                          />
                          <Input label="Username (Immutable)" value={user?.username} disabled />
                          <Input label="Email Address" type="email" value={user?.email} disabled />
                          <Input label="Phone Number" value={user?.phone || "Not provided"} disabled />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.07em] text-textMuted">Bio</label>
                          <textarea
                            maxLength="150"
                            value={draftData.bio}
                            onChange={(e) => setDraftData({ ...draftData, bio: e.target.value })}
                            placeholder="Tell us a little about yourself..."
                            className="w-full p-3 bg-background border border-borderSubtle rounded-xl text-textPrimary text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[90px] resize-none"
                          />
                          <p className="text-[10px] text-textMuted text-right">{draftData.bio.length}/150</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button type="submit" variant="primary" disabled={isLoading}>
                            {isLoading ? "Saving…" : "Save Changes"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ SECURITY TAB ════ */}
          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Change Password Card */}
              <div className="bg-surface rounded-2xl border border-borderSubtle overflow-hidden">
                <div className="px-6 py-4 border-b border-borderSubtle/60">
                  <h3 className="text-sm font-semibold text-textPrimary">Change Password</h3>
                  <p className="text-xs text-textMuted mt-0.5">Choose a strong password to keep your account secure.</p>
                </div>
                <form onSubmit={handlePasswordUpdate} className="px-6 py-5 space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="Enter your current password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="Min. 6 characters"
                    required
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                  <div className="pt-1">
                    <Button type="submit" variant="outline" disabled={isLoading}>
                      {isLoading ? "Updating…" : "Update Password"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Active Sessions Card */}
              <div className="bg-surface rounded-2xl border border-borderSubtle overflow-hidden">
                <div className="px-6 py-4 border-b border-borderSubtle/60">
                  <h3 className="text-sm font-semibold text-textPrimary">Active Sessions</h3>
                  <p className="text-xs text-textMuted mt-0.5">
                    If you notice suspicious activity, terminate all sessions globally.
                  </p>
                </div>
                <div className="px-6 py-5">
                  <Button onClick={handleLogoutAll} variant="outlineDanger">Log Out of All Devices</Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ PRIVACY TAB ════ */}
          {activeTab === "privacy" && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Privacy Controls */}
              <div className="bg-surface rounded-2xl border border-borderSubtle overflow-hidden">
                <div className="px-6 py-4 border-b border-borderSubtle/60">
                  <h3 className="text-sm font-semibold text-textPrimary">Privacy Boundaries</h3>
                  <p className="text-xs text-textMuted mt-0.5">Control what others can see about you.</p>
                </div>
                <div className="px-6 py-2">
                  <PrivacyRow
                    label="Last Seen & Online"
                    description="Choose who can see when you were last online."
                    value={user?.privacy?.lastSeen || "everyone"}
                    onChange={(e) => handlePrivacyUpdate("lastSeen", e.target.value)}
                    disabled={isLoading}
                  />
                  <PrivacyRow
                    label="Profile Photo"
                    description="Control who can view your profile picture."
                    value={user?.privacy?.profilePhoto || "everyone"}
                    onChange={(e) => handlePrivacyUpdate("profilePhoto", e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Blocked Users */}
              <div className="bg-surface rounded-2xl border border-borderSubtle overflow-hidden">
                <div className="px-6 py-4 border-b border-borderSubtle/60">
                  <h3 className="text-sm font-semibold text-textPrimary">Blocked Users</h3>
                  <p className="text-xs text-textMuted mt-0.5">
                    {user?.blockedUsers?.length > 0
                      ? `${user.blockedUsers.length} user${user.blockedUsers.length > 1 ? "s" : ""} blocked`
                      : "You have not blocked anyone"}
                  </p>
                </div>
                <div className="px-6 py-3">
                  {!user?.blockedUsers || user.blockedUsers.length === 0 ? (
                    <p className="text-sm text-textMuted italic py-3">Your block list is empty.</p>
                  ) : (
                    <div className="space-y-2 py-2">
                      {user.blockedUsers.map((blockedUser) => {
                        const blockedId = blockedUser._id || blockedUser;
                        const displayName = blockedUser.name || "Blocked User";
                        const usernameText = blockedUser.username ? `@${blockedUser.username}` : "";
                        const avatarSrc = blockedUser.profilePic;
                        return (
                          <div key={blockedId} className="flex items-center justify-between py-2.5 px-3 bg-background rounded-xl border border-borderSubtle/50">
                            <div className="flex items-center gap-3">
                              <Avatar src={avatarSrc} alt={displayName} size="sm" />
                              <div className="flex flex-col">
                                <span className="text-sm text-textPrimary font-medium">{displayName}</span>
                                {usernameText && <span className="text-xs text-textMuted">{usernameText}</span>}
                              </div>
                            </div>
                            <Button onClick={() => handleUnblock(blockedId)} variant="ghost" className="text-xs py-1 px-3">
                              Unblock
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="max-w-3xl w-full mx-auto px-6 lg:px-10 pb-8">
        <div className="pt-6 border-t border-borderSubtle flex justify-between items-center">
          <Button onClick={executeLogout} variant="outlineDanger">Sign Out</Button>
          <Button onClick={() => navigate("/settings")} variant="ghost">Advanced Settings ⚙️</Button>
        </div>
      </div>

      <ConfirmDialog {...confirmState} onClose={closeConfirm} />

      <footer className="w-full text-center py-5 border-t border-borderSubtle mt-auto bg-surface">
        <p className="text-[10px] text-textMuted tracking-[0.2em] uppercase font-bold">
          Designed &amp; Developed by Mehla Inc.
        </p>
      </footer>
    </div>
  );
}

export default Profile;
