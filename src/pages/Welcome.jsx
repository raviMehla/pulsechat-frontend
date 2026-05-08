// 🛡️ ARCHITECTURAL NOTE: No imports are needed here. 
// Vite handles React implicitly, and we have eliminated the need for 'useState', 'useEffect', and 'api'.

function Welcome() {
  // 1. Synchronous State Hydration
  // We instantly parse the user object stored during our secure Login flow.
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const userName = user?.name || user?.username || "User";

  // 2. Pure JSX Render
  return (
    <div className="h-full flex flex-col items-center justify-center bg-background text-textPrimary p-6 animate-fadeIn relative">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Animated App Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-surface rounded-3xl border border-borderSubtle shadow-xl flex items-center justify-center animate-bounce-slow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-accent">
              <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Personalized Greeting (Instant Render) */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-textPrimary">
          Welcome to PulseChat, {userName}!
        </h1>
        
        <p className="text-textMuted text-lg">
          Select a conversation from the sidebar to start messaging, or create a new group to connect with your team.
          click the 🔍 icon to find a user by their phone number or username.
        </p>

        {/* Call to Action Indicator */}
        <div className="pt-8 flex justify-center">
          <div className="px-6 py-3 bg-surface border border-borderSubtle rounded-full text-sm font-medium text-textMuted shadow-sm flex items-center gap-2">
            <span className="hidden md:inline">←</span> 
            Click 🔍 to search users
          </div>
        </div>
      </div>

      {/* 🛡️ UX Polish: Security / Encryption Badge (Bottom fixed) */}
      <div className="absolute bottom-8 flex items-center gap-1.5 text-xs text-textMuted font-medium opacity-80">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
        End-to-end encrypted
      </div>
    </div>
  );
}

export default Welcome;