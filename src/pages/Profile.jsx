import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { disconnectSocket } from "../services/socket";

// 🛡️ ARCHITECTURAL FIX: Importing all modular API functions
import { 
  updateUserProfile, 
  updatePassword, 
  logoutAllDevices, 
  toggleBlockUser 
} from "../services/user.api";

// 🟢 UI Primitives
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar"; 

function Profile() {
  const navigate = useNavigate();
  
  // 1. Synchronous State Hydration
  const userString = localStorage.getItem("user");
  const initialUser = userString ? JSON.parse(userString) : {};

  // Component States
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(initialUser);

  // Form States
  const [formData, setFormData] = useState({ 
    name: initialUser.name || "", 
    bio: initialUser.bio || "" 
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  // Image Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialUser.profilePic || null);
  const fileInputRef = useRef(null);

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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("bio", formData.bio);
      if (selectedFile) {
        submitData.append("profilePic", selectedFile);
      }

      // 🛡️ API Execution via abstraction
      const resData = await updateUserProfile(submitData);
      
      const updatedUser = resData.user || resData;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
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
      // 🛡️ API Execution via abstraction
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

  const handleLogoutAll = async () => {
    if (!window.confirm("Are you sure you want to log out of all other devices?")) return;
    try {
      // 🛡️ API Execution via abstraction
      await logoutAllDevices();
      toast.success("Logged out of all other devices.");
    } catch (error) {
      console.error("Global Logout Error:", error); 
      toast.error("Action failed");
    }
  };

  const handleUnblock = async (targetId) => {
    try {
      // 🛡️ API Execution via abstraction
      const resData = await toggleBlockUser(targetId);
      toast.success(resData.message || "User unblocked");
      
      setUser(prev => {
        const updatedUser = {
          ...prev, 
          blockedUsers: prev.blockedUsers.filter(id => id !== targetId)
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });
    } catch (error) {
      console.error("Unblock User Error:", error);
      toast.error("Failed to unblock user");
    }
  };

  const executeLogout = () => {
    disconnectSocket();
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="h-full flex flex-col bg-background text-textPrimary overflow-y-auto custom-scrollbar animate-fadeIn">
      <div className="max-w-3xl w-full mx-auto p-6 lg:p-10 flex-1">
        
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={() => navigate("/")} variant="ghost" className="!px-2 !py-1 text-2xl" title="Back to Platform">
            ←
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Account</h1>
        </div>

        <div className="flex gap-6 border-b border-borderSubtle mb-8">
          {["general", "security", "privacy"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 font-semibold capitalize transition-all duration-200 ${
                activeTab === tab ? "border-b-2 border-accent text-accent" : "text-textMuted hover:text-textPrimary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* --- GENERAL TAB --- */}
        {activeTab === "general" && (
          <form onSubmit={handleProfileUpdate} className="space-y-8 animate-fadeIn">
            <div className="flex flex-col items-start space-y-4 pb-4">
              <div className="relative group cursor-pointer w-24 h-24">
                <Avatar 
                  src={previewUrl} 
                  alt={formData.name || "User"} 
                  size="xxl" 
                  className="transition-opacity group-hover:opacity-75"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full"
                >
                  <span className="text-white text-xs font-semibold">Change</span>
                </button>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input label="Display Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required/>
              <Input label="Username (Immutable)" value={user?.username} disabled />
              <Input label="Email Address" type="email" value={user?.email} disabled />
              <Input label="Phone Number" value={user?.phone || "Not provided"} disabled />
            </div>

            <div className="space-y-1 w-full">
              <label className="text-sm font-medium text-textMuted">Bio</label>
              <textarea 
                maxLength="150"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us a little about yourself..."
                className="w-full p-2.5 bg-surface border border-borderSubtle rounded-lg text-textPrimary outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[100px] resize-none"
              />
            </div>

            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}

        {/* --- SECURITY TAB --- */}
        {activeTab === "security" && (
          <div className="space-y-8 animate-fadeIn">
            <form onSubmit={handlePasswordUpdate} className="space-y-4 bg-surface p-6 rounded-xl border border-borderSubtle shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Change Password</h3>
              <Input type="password" placeholder="Current Password" required value={passwords.currentPassword} onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} />
              <Input type="password" placeholder="New Password (min 6 chars)" required value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} />
              <div className="pt-2">
                <Button type="submit" variant="outline" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>

            <div className="bg-surface p-6 rounded-xl border border-borderSubtle space-y-4 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold">Active Sessions</h3>
                <p className="text-sm text-textMuted mt-1">If you notice suspicious activity, log out of all other devices globally.</p>
              </div>
              <Button onClick={handleLogoutAll} variant="outlineDanger">Log Out of All Other Devices</Button>
            </div>
          </div>
        )}

        {/* --- PRIVACY TAB --- */}
        {activeTab === "privacy" && (
          <div className="space-y-6 animate-fadeIn bg-surface p-6 rounded-xl border border-borderSubtle shadow-sm">
            <h3 className="text-lg font-semibold">Blocked Users</h3>
            {!user?.blockedUsers || user.blockedUsers.length === 0 ? (
              <p className="text-sm text-textMuted italic">You have not blocked any users.</p>
            ) : (
              <div className="space-y-3">
                {user.blockedUsers.map((blockedUserId) => (
                  <div key={blockedUserId} className="flex items-center justify-between p-3 bg-background border border-borderSubtle rounded-lg">
                    <span className="text-sm text-textMuted font-mono">{blockedUserId}</span>
                    <Button onClick={() => handleUnblock(blockedUserId)} variant="ghost" className="text-xs py-1 px-3">
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-borderSubtle flex justify-between items-center">
          <Button onClick={executeLogout} variant="outlineDanger">Sign Out</Button>
          <Button onClick={() => navigate('/settings')} variant="ghost">Advanced Settings ⚙️</Button>
        </div>
      </div>

      <footer className="w-full text-center py-6 border-t border-borderSubtle mt-auto bg-surface">
        <p className="text-[10px] text-textMuted tracking-[0.2em] uppercase font-bold">
          Designed & Developed by Mehla Inc.
        </p>
      </footer>
    </div>
  );
}

export default Profile;