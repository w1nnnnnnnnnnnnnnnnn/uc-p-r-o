import React, { useState, useEffect } from "react";
import "./App.css";

/* 🔐 Firebase */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

/* =======================
   🔧 FIREBASE SETUP
======================= */
const firebaseConfig = {
  apiKey: "DEIN_KEY",
  authDomain: "DEIN_DOMAIN",
  projectId: "DEIN_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function App() {
  /* =======================
     🎛 STATE
  ======================= */
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [folders, setFolders] = useState([]);
  const [design, setDesign] = useState("realistic3");
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);

  /* =======================
     🔐 GOOGLE LOGIN
  ======================= */
  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
  };

  /* =======================
     🔄 INIT AUTH + SPOTIFY TOKEN
  ======================= */
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));

    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    const hash = window.location.hash;
    if (hash) {
      const t = hash
        .substring(1)
        .split("&")
        .find(e => e.startsWith("access_token"))
        ?.split("=")[1];

      if (t) {
        setToken(t);
        window.location.hash = "";
      }
    }
  }, []);

  /* =======================
     🎧 SPOTIFY LOGIN
  ======================= */
  const loginSpotify = () => {
    window.location.href =
      "https://accounts.spotify.com/authorize?client_id=DEIN_SPOTIFY_ID&response_type=token&redirect_uri=http://localhost:5173";
  };

  /* =======================
     🎵 FETCH PLAYLISTS
  ======================= */
  const loadPlaylists = async () => {
    const res = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPlaylists(data.items || []);
  };

  /* =======================
     📁 ADD TO FOLDER
  ======================= */
  const addToSpotifyFolder = (playlist) => {
    let updated = [...folders];
    let folder = updated.find(f => f.name === "Spotify Playlists");

    if (!folder) {
      folder = { name: "Spotify Playlists", items: [] };
      updated.push(folder);
    }

    folder.items.push(playlist);
    setFolders(updated);
  };

  /* =======================
     🖱 DRAG & DROP
  ======================= */
  const onDragStart = (e, item) => {
    e.dataTransfer.setData("playlist", JSON.stringify(item));
  };

  const onDrop = (e) => {
    const data = JSON.parse(e.dataTransfer.getData("playlist"));

    const updated = folders.map(f => ({
      ...f,
      items: f.items.filter(p => p.id !== data.id)
    }));

    setFolders(updated);
    setDragOver(false);
  };

  /* =======================
     🎨 DESIGN STYLE
  ======================= */
  const getDesignStyle = () => {
    switch (design) {
      case "realistic3":
        return {
          background: "linear-gradient(145deg,#6b4a2f,#3a2418)",
          border: "10px solid #111",
          boxShadow: "inset 0 0 25px black,0 10px 30px rgba(0,0,0,0.7)"
        };
      case "dark":
        return { background: "linear-gradient(#111,#000)" };
      case "chrome":
        return { background: "linear-gradient(145deg,#eee,#888,#eee)" };
      case "wood":
        return {
          background:
            "repeating-linear-gradient(90deg,#6b4a2f,#6b4a2f 10px,#5a3e2b 10px,#5a3e2b 20px)"
        };
      default:
        return {};
    }
  };

  /* =======================
     ⏳ LOADING
  ======================= */
  if (loading) return <p>Lade...</p>;

  /* =======================
     🎧 UI
  ======================= */
  return (
    <div style={{ padding: 20 }}>

      <h1>🎛 Turntable App</h1>

      {/* 🔐 LOGIN */}
      {!user && <button onClick={loginGoogle}>Google Login</button>}
      {user && <p>Hallo {user.displayName}</p>}

      {/* 🎧 SPOTIFY */}
      <button onClick={loginSpotify}>Spotify Login</button>
      {token && <button onClick={loadPlaylists}>Load Playlists</button>}

      {/* 🎨 DESIGN SWITCH */}
      <div>
        <button onClick={() => setDesign("realistic3")}>Realistic</button>
        <button onClick={() => setDesign("dark")}>Dark</button>
        <button onClick={() => setDesign("chrome")}>Chrome</button>
        <button onClick={() => setDesign("wood")}>Wood</button>
      </div>

      {/* 🎛 TURNtable */}
      <div style={{ ...getDesignStyle(), position: "relative", width: 420, height: 300 }}>

        {/* PLATE */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            position: "absolute",
            top: 40,
            left: 80,
            background: "radial-gradient(circle,#555,#111)",
            zIndex: 1
          }}
        />

        {/* VINYL */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            position: "absolute",
            top: 40,
            left: 80,
            background: "black",
            zIndex: 2,
            animation: isPlaying ? "spin 1.8s linear infinite" : "none"
          }}
        />

        {/* TONEARM */}
        <div
          style={{
            width: 120,
            height: 6,
            background: "silver",
            position: "absolute",
            right: 40,
            top: 60,
            transform: isPlaying ? "rotate(20deg)" : "rotate(5deg)",
            transition: "0.5s",
            zIndex: 4
          }}
        />

        {/* CONTROLS */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10
          }}
        >
          <button onClick={() => setIsPlaying(true)}>▶</button>
          <button onClick={() => setIsPlaying(false)}>⏸</button>
        </div>
      </div>

      {/* 🎵 PLAYLISTS */}
      <div>
        {playlists.map(p => (
          <div
            key={p.id}
            draggable
            onDragStart={(e) => onDragStart(e, p)}
          >
            {p.name}
            <button onClick={() => addToSpotifyFolder(p)}>+</button>
          </div>
        ))}
      </div>

      {/* 📁 FOLDERS */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDrop={onDrop}
        style={{
          border: dragOver ? "2px solid lime" : "2px solid gray",
          marginTop: 20,
          padding: 10
        }}
      >
        {folders
          .filter(f => f.items.length > 0)
          .map(f => (
            <div key={f.name}>
              <h3>{f.name}</h3>
              {f.items.map(p => (
                <div key={p.id}>{p.name}</div>
              ))}
            </div>
          ))}
      </div>

      {/* 🔁 ANIMATION */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
