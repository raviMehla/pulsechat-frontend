import { useState, useEffect, useRef } from "react";
import localforage from "localforage";
import toast from "react-hot-toast";
import { getAvatarUrl } from "../utils/getAvatarUrl";
import api from "../services/api";

const GRADIENTS = [
  ["linear-gradient(135deg, #8EC5FC 0%, #E0C3FC 100%)", "#8EC5FC", "#E0C3FC"],
  ["linear-gradient(135deg, #f77062 0%, #fe5196 100%)", "#f77062", "#fe5196"],
  ["linear-gradient(135deg, #30cfd0 0%, #330867 100%)", "#30cfd0", "#330867"],
  ["linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)", "#0F2027", "#2C5364"],
  ["linear-gradient(135deg, #F76B1C 0%, #FAD961 100%)", "#F76B1C", "#FAD961"],
];

const INITIAL_MOCK_UPDATES = [
  {
    _id: "mock_1",
    user: {
      name: "Jane Cooper",
      username: "janecooper",
      profilePic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    },
    stories: [
      { _id: "mock_s1", type: "image", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", createdAt: new Date(Date.now() - 3600000).toISOString() },
      { _id: "mock_s2", type: "text", content: "Loving the beach vibe today! 🏖️✨", gradient: ["linear-gradient(135deg, #f77062 0%, #fe5196 100%)", "#f77062", "#fe5196"], createdAt: new Date(Date.now() - 1800000).toISOString() }
    ],
    viewed: false,
  },
  {
    _id: "mock_2",
    user: {
      name: "Alex Rivera",
      username: "alexrivera",
      profilePic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    },
    stories: [
      { _id: "mock_s3", type: "image", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800", createdAt: new Date(Date.now() - 7200000).toISOString() }
    ],
    viewed: false,
  },
  {
    _id: "mock_3",
    user: {
      name: "Emma Watson",
      username: "emmawatson",
      profilePic: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    },
    stories: [
      { _id: "mock_s4", type: "text", content: '"The only way to do great work is to love what you do." - Steve Jobs 💡', gradient: ["linear-gradient(135deg, #30cfd0 0%, #330867 100%)", "#30cfd0", "#330867"], createdAt: new Date(Date.now() - 14400000).toISOString() }
    ],
    viewed: true,
  }
];

function Status() {
  const currentUserId = localStorage.getItem("userId");
  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;

  // Status lists
  const [myStatus, setMyStatus] = useState(null);
  const [othersUpdates, setOthersUpdates] = useState([]);
  const [viewedMockStoryIds, setViewedMockStoryIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Creators
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [activeGradientIdx, setActiveGradientIdx] = useState(0);
  const fileInputRef = useRef(null);

  // Viewer
  const [activeUser, setActiveUser] = useState(null); // the user whose stories we are viewing
  const [activeStories, setActiveStories] = useState([]); // list of stories for the active user
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [isPaused, setIsPaused] = useState(false);

  // Load viewed mock story IDs from localforage
  useEffect(() => {
    const loadViewedMocks = async () => {
      try {
        const stored = await localforage.getItem("viewed_mock_story_ids");
        if (stored) {
          setViewedMockStoryIds(stored);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadViewedMocks();
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await api.get("/status");
      setMyStatus(res.data.mine || null);
      
      const backendOthers = res.data.others || [];
      
      const filteredMocks = INITIAL_MOCK_UPDATES.filter(mock => 
        !backendOthers.some(other => other.user.username === mock.user.username)
      );

      const processedOthers = [...backendOthers, ...filteredMocks].map(up => {
        const isMock = String(up._id).startsWith("mock");
        if (isMock) {
          const allViewed = up.stories.every(story => 
            viewedMockStoryIds.includes(story._id)
          );
          return { ...up, viewed: allViewed };
        } else {
          const allViewed = up.stories.every(story => 
            story.viewedBy?.some(id => String(id) === String(currentUserId))
          );
          return { ...up, viewed: allViewed };
        }
      });

      setOthersUpdates(processedOthers);
    } catch (err) {
      console.error("Failed to load statuses:", err);
      // Fallback to mocks if offline/API fails
      const fallbackOthers = INITIAL_MOCK_UPDATES.map(up => {
        const allViewed = up.stories.every(story => 
          viewedMockStoryIds.includes(story._id)
        );
        return { ...up, viewed: allViewed };
      });
      setOthersUpdates(fallbackOthers);
    }
  };

  // Load user status
  useEffect(() => {
    if (currentUserId) {
      fetchStatuses();
    }
  }, [currentUserId, viewedMockStoryIds]);

  // Autoplay story viewer logic
  useEffect(() => {
    if (!activeUser || activeStories.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 2; // 2% progress every 100ms = 5s total duration
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeUser, activeStoryIdx, activeStories, isPaused]);

  // Mark active story as viewed
  useEffect(() => {
    if (!activeUser || activeStories.length === 0) return;
    const currentStory = activeStories[activeStoryIdx];
    if (!currentStory) return;

    const markAsViewed = async () => {
      const isMock = String(currentStory._id).startsWith("mock");
      if (isMock) {
        if (!viewedMockStoryIds.includes(currentStory._id)) {
          const updated = [...viewedMockStoryIds, currentStory._id];
          setViewedMockStoryIds(updated);
          await localforage.setItem("viewed_mock_story_ids", updated);
        }
      } else {
        try {
          await api.put(`/status/view/${currentStory._id}`);
          // Update viewedBy array locally to update the border color instantly
          setOthersUpdates(prev => 
            prev.map(up => {
              if (up.user.username === activeUser.username) {
                const updatedStories = up.stories.map(story => {
                  if (story._id === currentStory._id) {
                    const viewedBy = story.viewedBy || [];
                    if (!viewedBy.includes(currentUserId)) {
                      return { ...story, viewedBy: [...viewedBy, currentUserId] };
                    }
                  }
                  return story;
                });
                const allViewed = updatedStories.every(story => 
                  story.viewedBy?.some(id => String(id) === String(currentUserId))
                );
                return { ...up, stories: updatedStories, viewed: allViewed };
              }
              return up;
            })
          );
        } catch (err) {
          console.error("Failed to mark story as viewed on server:", err);
        }
      }
    };

    markAsViewed();
  }, [activeUser, activeStoryIdx, activeStories, currentUserId, viewedMockStoryIds]);

  const handleNextStory = () => {
    if (activeStoryIdx < activeStories.length - 1) {
      setActiveStoryIdx(prev => prev + 1);
      setProgress(0);
    } else {
      closeViewer();
    }
  };

  const handlePrevStory = () => {
    if (activeStoryIdx > 0) {
      setActiveStoryIdx(prev => prev - 1);
      setProgress(0);
    } else {
      closeViewer();
    }
  };

  const closeViewer = () => {
    setActiveUser(null);
    setActiveStories([]);
    setActiveStoryIdx(0);
    setProgress(0);
    setIsPaused(false);
  };

  const handleTextStatusCreate = async () => {
    if (!statusText.trim()) return;

    try {
      await api.post("/status", {
        type: "text",
        content: statusText.trim(),
        gradient: GRADIENTS[activeGradientIdx]
      });
      
      setStatusText("");
      setShowTextCreator(false);
      toast.success("Text status published!");
      fetchStatuses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish status");
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("type", "image");
      formData.append("image", file);

      await api.post("/status", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Image status published!");
      fetchStatuses();
    } catch (err) {
      console.error(err);
      toast.error("Failed to publish image status");
    }
  };

  const handleClearStatus = async () => {
    if (window.confirm("Delete all your status updates?")) {
      try {
        await api.delete("/status");
        setMyStatus(null);
        toast.success("Status updates cleared");
        fetchStatuses();
      } catch (err) {
        console.error(err);
        toast.error("Failed to clear status");
      }
    }
  };

  const formatStoryTime = (isoStr) => {
    const diff = Date.now() - new Date(isoStr);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(isoStr).toLocaleDateString();
  };

  const filteredOthers = othersUpdates.filter(up => 
    up.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-background text-textPrimary overflow-hidden">
      
      {/* LEFT SIDEBAR PANEL: Status list */}
      <div className="w-full md:w-[350px] lg:w-[400px] border-r border-borderSubtle bg-surface flex flex-col h-full z-10 shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-borderSubtle/60 flex items-center justify-between flex-shrink-0">
          <h1 className="text-2xl font-bold tracking-tight">Status</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowTextCreator(true)}
              className="w-9 h-9 bg-bg hover:bg-gray-800 border border-gray-700 text-white rounded-lg flex items-center justify-center transition-all"
              title="Create Text Status"
            >
              ✍️
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 bg-accent hover:bg-accent/80 text-white rounded-lg flex items-center justify-center transition-all font-semibold"
              title="Create Image Status"
            >
              📷
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-borderSubtle/30 flex-shrink-0">
          <input
            type="text"
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg border border-gray-800 rounded-md py-2 px-3 text-sm text-textPrimary outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Status Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* My Status Row */}
          <div>
            <h2 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">My Updates</h2>
            <div className="flex items-center justify-between p-2 rounded-xl bg-bg/40 border border-borderSubtle/25">
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                onClick={() => {
                  if (myStatus && myStatus.stories?.length > 0) {
                    setActiveUser({ name: "My Status", username: currentUser?.username, profilePic: currentUser?.profilePic });
                    setActiveStories(myStatus.stories);
                    setActiveStoryIdx(0);
                    setProgress(0);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <img 
                    src={getAvatarUrl(currentUser?.profilePic)} 
                    alt="Me" 
                    className="w-full h-full rounded-full object-cover border border-white/10" 
                  />
                  {myStatus && myStatus.stories?.length > 0 ? (
                    <div className="absolute inset-0 rounded-full border-2 border-accent animate-pulse" />
                  ) : (
                    <div className="absolute -bottom-1 -right-1 bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-surface">+</div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-textPrimary truncate">My Status</span>
                  <span className="text-xs text-textMuted truncate">
                    {myStatus && myStatus.stories?.length > 0 
                      ? `Tap to view • ${formatStoryTime(myStatus.stories[myStatus.stories.length - 1].createdAt)}`
                      : "Tap to add status update"}
                  </span>
                </div>
              </div>
              
              {myStatus && myStatus.stories?.length > 0 && (
                <button 
                  onClick={handleClearStatus}
                  className="p-2 text-textMuted hover:text-danger transition-colors"
                  title="Delete Updates"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Recent Updates */}
          {filteredOthers.filter(u => !u.viewed).length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Recent Updates</h2>
              <div className="space-y-3">
                {filteredOthers.filter(u => !u.viewed).map((item) => (
                  <div 
                    key={item._id}
                    onClick={() => {
                      setActiveUser(item.user);
                      setActiveStories(item.stories);
                      setActiveStoryIdx(0);
                      setProgress(0);
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg/40 cursor-pointer border border-transparent hover:border-borderSubtle/25 transition-all"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img 
                        src={getAvatarUrl(item.user.profilePic)} 
                        alt={item.user.name} 
                        className="w-full h-full rounded-full object-cover border border-white/10" 
                      />
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-textPrimary truncate">{item.user.name}</span>
                      <span className="text-xs text-textMuted truncate">
                        {formatStoryTime(item.stories[item.stories.length - 1].createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewed Updates */}
          {filteredOthers.filter(u => u.viewed).length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-3">Viewed Updates</h2>
              <div className="space-y-3">
                {filteredOthers.filter(u => u.viewed).map((item) => (
                  <div 
                    key={item._id}
                    onClick={() => {
                      setActiveUser(item.user);
                      setActiveStories(item.stories);
                      setActiveStoryIdx(0);
                      setProgress(0);
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg/40 cursor-pointer border border-transparent hover:border-borderSubtle/25 opacity-75 transition-all"
                  >
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <img 
                        src={getAvatarUrl(item.user.profilePic)} 
                        alt={item.user.name} 
                        className="w-full h-full rounded-full object-cover border border-white/10" 
                      />
                      <div className="absolute inset-0 rounded-full border-2 border-gray-700" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-textSecondary truncate">{item.user.name}</span>
                      <span className="text-xs text-textMuted truncate">
                        {formatStoryTime(item.stories[item.stories.length - 1].createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE MAIN VIEW: Display active story or welcome page */}
      <div className="flex-1 h-full relative bg-bg flex flex-col items-center justify-center min-w-0">
        
        {activeUser ? (
          /* ACTIVE STORIES VIEWER */
          <div className="w-full max-w-lg h-full max-h-[85vh] md:max-h-[90vh] bg-black md:rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4 z-20">
            
            {/* Playback Progress Segmented Bars */}
            <div className="flex gap-1.5 w-full mb-4 z-30">
              {activeStories.map((_, index) => {
                let widthPercent = "0%";
                if (index < activeStoryIdx) widthPercent = "100%";
                else if (index === activeStoryIdx) widthPercent = `${progress}%`;
                
                return (
                  <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                      style={{ width: widthPercent }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Viewer Header */}
            <div className="flex items-center justify-between w-full z-30 text-white mb-4">
              <div className="flex items-center gap-3">
                <img 
                  src={getAvatarUrl(activeUser.profilePic)} 
                  alt={activeUser.name} 
                  className="w-9 h-9 rounded-full object-cover border border-white/10" 
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{activeUser.name}</span>
                  <span className="text-[10px] text-white/60">
                    {activeStories[activeStoryIdx] ? formatStoryTime(activeStories[activeStoryIdx].createdAt) : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPaused(p => !p)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition-colors"
                >
                  {isPaused ? "▶️" : "⏸️"}
                </button>
                <button 
                  onClick={closeViewer}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs transition-colors font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="flex-1 w-full relative flex items-center justify-center z-15 bg-black/40 rounded-lg overflow-hidden select-none">
              
              {/* Tap Zones */}
              <div className="absolute left-0 top-0 bottom-0 w-[30%] z-20 cursor-pointer" onClick={handlePrevStory} />
              <div className="absolute right-0 top-0 bottom-0 w-[70%] z-20 cursor-pointer" onClick={handleNextStory} />

              {activeStories[activeStoryIdx]?.type === "image" ? (
                <img 
                  src={activeStories[activeStoryIdx].url} 
                  alt="Status" 
                  className="max-w-full max-h-full object-contain pointer-events-none"
                />
              ) : activeStories[activeStoryIdx]?.type === "text" ? (
                <div 
                  className="w-full h-full flex items-center justify-center p-6 text-center text-white"
                  style={{ background: activeStories[activeStoryIdx].gradient?.[0] || "#7C6EF7" }}
                >
                  <p className="text-2xl font-bold leading-relaxed break-words font-sans max-w-xs drop-shadow-md">
                    {activeStories[activeStoryIdx].content}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Hint */}
            <div className="text-center z-30 text-white/50 text-[10px] py-2 font-medium tracking-wide mt-2">
              Tap left for back, right for next • {isPaused ? "Paused" : "Playing"}
            </div>
          </div>
        ) : (
          /* EMPTY WELCOME PANEL */
          <div className="text-center p-8 max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-surface border border-gray-800 text-accent rounded-2xl flex items-center justify-center font-bold text-3xl shadow-xl mb-6 animate-pulse">
              ⭕
            </div>
            <h3 className="text-lg font-bold text-textPrimary mb-2">Circle of Stories</h3>
            <p className="text-sm text-textMuted leading-relaxed">
              Select a contact status from the updates column to view their story slides, or post your own update using the buttons above!
            </p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TEXT STATUS CREATOR MODAL
          ───────────────────────────────────────────────────────────── */}
      {showTextCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div 
            className="w-full max-w-lg h-full max-h-[85vh] p-6 flex flex-col justify-between rounded-2xl relative shadow-2xl transition-all"
            style={{ background: GRADIENTS[activeGradientIdx][0] }}
          >
            {/* Header */}
            <div className="flex justify-between items-center z-30">
              <button 
                onClick={() => setShowTextCreator(false)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white text-lg font-bold transition-all"
              >
                ✕
              </button>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveGradientIdx(idx => (idx + 1) % GRADIENTS.length)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white text-lg transition-all"
                  title="Change Gradient"
                >
                  🎨
                </button>
                {statusText.trim().length > 0 && (
                  <button 
                    onClick={handleTextStatusCreate}
                    className="w-10 h-10 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-white text-lg font-bold transition-all"
                    title="Publish status"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="flex-1 flex items-center justify-center p-4">
              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Type a status update..."
                maxLength="100"
                className="w-full bg-transparent text-white text-3xl font-bold font-sans text-center border-none outline-none resize-none placeholder-white/50 h-32 focus:ring-0 max-w-xs"
                autoFocus
              />
            </div>

            {/* Footer Limit */}
            <div className="text-right text-xs text-white/60 font-semibold tracking-wider">
              {statusText.length} / 100
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Status;
