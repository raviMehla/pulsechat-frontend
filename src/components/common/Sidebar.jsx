import { NavLink, useNavigate } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { disconnectSocket } from "../../services/socket";

function Sidebar() {
  const navigate = useNavigate();
  // Safely parse the user object we stored during our Login fix
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    // 1. Terminate the real-time connection instantly
    disconnectSocket();
    
    // 2. Clear all state
    localStorage.clear();
    sessionStorage.clear();
    
    // 3. Force redirect to login
    navigate("/login");
  };

  // NavLink helper to automatically apply our 'accent' color when a route is active
  const navClass = ({ isActive }) =>
    `p-3 rounded-xl transition-all flex items-center justify-center ${
      isActive 
        ? "bg-accent/10 text-accent shadow-sm" 
        : "text-textMuted hover:bg-background hover:text-textPrimary"
    }`;

  return (
    <nav className="flex md:flex-col items-center justify-between bg-surface border-t md:border-t-0 md:border-r border-borderSubtle md:w-[72px] h-[60px] md:h-full py-2 md:py-6 px-6 md:px-0 z-50 flex-shrink-0">
      
      {/* Top Section (Desktop) / Left Section (Mobile) */}
      <div className="flex md:flex-col items-center gap-2 md:gap-6 w-full md:w-auto justify-around md:justify-start">
        
        {/* Brand / Logo */}
        <div className="hidden md:flex w-10 h-10 bg-accent text-white rounded-xl items-center justify-center font-bold text-xl shadow-md mb-4">
          P
        </div>

        {/* Navigation Links */}
        <NavLink to="/" className={navClass} title="Chats">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </NavLink>

        <NavLink to="/profile" className={navClass} title="Profile">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </NavLink>

        <NavLink to="/settings" className={navClass} title="Settings">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NavLink>
      </div>

      {/* Bottom Section (Desktop) / Right Section (Mobile) */}
      <div className="flex md:flex-col items-center gap-2 md:gap-4">
        <button 
          onClick={handleLogout}
          className="p-3 rounded-xl text-textMuted hover:bg-danger/10 hover:text-danger transition-all"
          title="Logout"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>

        {/* Current User Avatar */}
        <div className="hidden md:block mt-2">
          <Avatar src={user?.profilePic} alt={user?.name || "User"} size="sm" isOnline={true} />
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;