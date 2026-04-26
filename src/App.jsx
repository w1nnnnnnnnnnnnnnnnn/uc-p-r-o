import React, { useEffect, useRef, useState } from "react";

export default function App() {
  /* ================= STATE ================= */

  const [view, setView] = useState("auth");

  const [projects, setProjects] = useState({});
  const [activeProject, setActiveProject] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [dynamicVinyl, setDynamicVinyl] = useState(false);

  const [projectProgress, setProjectProgress] = useState(0);

  const audioRef = useRef(null);

  const currentTrack = tracks[currentIndex];

  /* ================= VINYL COLOR ENGINE ================= */

  const liveColor = dynamicVinyl
    ? `hsl(${(Date.now() / 40) % 360}, 85%, 55%)`
    : vinylColor;

  /* ================= PROJECT PROGRESS ENGINE ================= */

  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !playing || !tracks.length) return;

      const before = tracks
        .slice(0, currentIndex)
        .reduce((a, t) => a + (t.duration || 0), 0);

      const total = tracks.reduce((a, t) => a + (t.duration || 0), 0);

      const progress = (before + audio.currentTime) / total;

      setProjectProgress(progress || 0);
    }, 100);

    return () => clearInterval(interval);
  }, [playing, currentIndex, tracks]);

  /* ================= PLAYBACK ================= */

  function playTrack(i) {
    if (!tracks[i]) return;

    setCurrentIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.play().catch(() => {});
    }, 20);
  }

  function togglePlay() {
    const audio = audioRef.current;

    if (!audio.src && tracks.length) {
      playTrack(0);
      return;
    }

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  }

  function next() {
    if (currentIndex < tracks.length - 1) playTrack(currentIndex + 1);
  }

  function prev() {
    if (currentIndex > 0) playTrack(currentIndex - 1);
  }

  /* ================= AUTO NEXT ================= */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnd = () => {
      if (currentIndex < tracks.length - 1) {
        playTrack(currentIndex + 1);
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener("ended", onEnd);
    return () => audio.removeEventListener("ended", onEnd);
  }, [currentIndex, tracks]);

  /* ================= STYLUS MOVEMENT ================= */

  const stylusAngle = 30 - projectProgress * 18;

  /* ================= AUTH (MINIMAL PLACEHOLDER) ================= */

  if (view === "auth") {
    return (
      <div style={styles.center}>
        <button onClick={() => setView("studio")}>enter</button>
      </div>
    );
  }

  /* ================= MAIN UI (DEIN LAYOUT BLEIBT HIER) ================= */

  return (
    <div style={styles.app}>
      {/* LEFT PANEL */}
      <div style={styles.sidebar}>
        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <label>
          <input
            type="checkbox"
            checked={dynamicVinyl}
            onChange={() => setDynamicVinyl(!dynamicVinyl)}
          />
          dynamic vinyl
        </label>

        <input
          type="file"
          multiple
          accept=".mp3,.wav"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);

            const loaded = await Promise.all(
              files.map(
                (file) =>
                  new Promise((res) => {
                    const url = URL.createObjectURL(file);
                    const audio = new Audio(url);

                    audio.addEventListener("loadedmetadata", () => {
                      res({
                        name: file.name,
                        url,
                        duration: audio.duration || 0
                      });
                    });
                  })
              )
            );

            setTracks(loaded);
          }}
        />
      </div>

      {/* CENTER VINYL */}
      <div style={styles.center}>
        <div style={styles.turntable}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle at 35% 35%, ${liveColor}, #000 80%)`,
              animation: playing ? "spin 1.4s linear infinite" : "none"
            }}
          />

          {/* STYLUS (REAL MOVEMENT) */}
          <div
            style={{
              ...styles.arm,
              transform: `rotate(${stylusAngle}deg)`
            }}
          />
        </div>
      </div>

      {/* PLAYER */}
      <div style={styles.player}>
        <button onClick={prev}>⏮</button>
        <button onClick={togglePlay}>{playing ? "pause" : "play"}</button>
        <button onClick={next}>⏭</button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLES (PLACEHOLDER = dein altes Design bleibt hier!) ================= */

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white"
  },

  sidebar: {
    width: 240,
    padding: 20
  },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  turntable: {
    position: "relative"
  },

  vinyl: {
    width: 380,
    height: 380,
    borderRadius: "50%"
  },

  arm: {
    position: "absolute",
    width: 160,
    height: 6,
    background: "white",
    right: -60,
    top: 190,
    transformOrigin: "left"
  },

  player: {
    position: "fixed",
    bottom: 10,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 10
  },

  center: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }
};

/* ================= ANIMATION ================= */

const style = document.createElement("style");
style.innerHTML = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
body { margin: 0; font-family: monospace; }
`;
document.head.appendChild(style);
