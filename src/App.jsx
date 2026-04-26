import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");
  const [splatterColor, setSplatterColor] = useState("#ff3366");

  const audioRef = useRef(null);

  const current = tracks[index];

  /* ================= MULTI TRACK FIX ================= */

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const a = new Audio(url);

            a.addEventListener("loadedmetadata", () => {
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: a.duration || 0,
                cover: null
              });
            });
          })
      )
    );

    setTracks((prev) => [...prev, ...loaded]);
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.play();
    }, 30);
  }

  function toggle() {
    if (!audioRef.current.src && tracks[0]) {
      play(0);
      return;
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function next() {
    if (index < tracks.length - 1) play(index + 1);
  }

  function prev() {
    if (index > 0) play(index - 1);
  }

  useEffect(() => {
    const a = audioRef.current;

    const ended = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("ended", ended);
    return () => a.removeEventListener("ended", ended);
  }, [index, tracks]);

  /* ================= UI ================= */

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <label style={styles.btn}>
          Add Tracks
          <input
            hidden
            multiple
            type="file"
            accept=".mp3,.wav"
            onChange={addTracks}
          />
        </label>

        <div style={styles.label}>Vinyl Base</div>
        <input
          type="color"
          value={vinylColor}
          onChange={(e) => setVinylColor(e.target.value)}
        />

        <div style={styles.label}>Splatter</div>
        <input
          type="color"
          value={splatterColor}
          onChange={(e) => setSplatterColor(e.target.value)}
        />

        <div style={{ marginTop: 20 }}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={styles.track}
              onClick={() => play(i)}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* Vinyl */}
      <div style={styles.center}>
        <div style={styles.turntable}>
          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle, ${vinylColor}, #000 78%)`,
              animation: playing
                ? "spin 1.8s linear infinite"
                : "none"
            }}
          >
            {/* Grooves */}
            <div style={styles.grooves} />

            {/* Shine Point = rotation visible */}
            <div style={styles.shine} />

            {/* Sweetart Splatter */}
            <div
              style={{
                ...styles.blob1,
                background: splatterColor
              }}
            />
            <div
              style={{
                ...styles.blob2,
                background: splatterColor
              }}
            />
            <div
              style={{
                ...styles.blob3,
                background: splatterColor
              }}
            />
            <div
              style={{
                ...styles.blob4,
                background: splatterColor
              }}
            />

            {/* Center */}
            <div style={styles.labelCenter}>
              {current?.name || "AURAE"}
            </div>
          </div>

          {/* Stylus */}
          <div
            style={{
              ...styles.arm,
              transform: playing
                ? "rotate(18deg)"
                : "rotate(26deg)"
            }}
          />
        </div>
      </div>

      {/* Player */}
      <div style={styles.player}>
        <button style={styles.btn} onClick={prev}>⏮</button>
        <button style={styles.btn} onClick={toggle}>
          {playing ? "Pause" : "Play"}
        </button>
        <button style={styles.btn} onClick={next}>⏭</button>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}

/* ================= STYLE ================= */

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "Courier New"
  },

  sidebar: {
    width: 260,
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
    width: 420,
    height: 420,
    borderRadius: "50%",
    position: "relative",
    boxShadow:
      "0 50px 120px rgba(0,0,0,0.9)"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.06) 0px, transparent 2px)"
  },

  shine: {
    position: "absolute",
    width: 120,
    height: 40,
    borderRadius: "50%",
    top: 30,
    left: 140,
    background:
      "rgba(255,255,255,0.12)",
    filter: "blur(10px)"
  },

  blob1: {
    position: "absolute",
    width: 100,
    height: 60,
    borderRadius: "60% 40% 50% 70%",
    top: 60,
    left: 90
  },

  blob2: {
    position: "absolute",
    width: 70,
    height: 90,
    borderRadius: "60% 50% 70% 30%",
    top: 210,
    left: 260
  },

  blob3: {
    position: "absolute",
    width: 80,
    height: 55,
    borderRadius: "50%",
    top: 300,
    left: 130
  },

  blob4: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: "50%",
    top: 140,
    left: 300
  },

  labelCenter: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: "50%",
    background: "#111",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 12
  },

  arm: {
    position: "absolute",
    width: 180,
    height: 6,
    background: "white",
    top: 215,
    right: -100,
    transformOrigin: "left center",
    borderRadius: 10,
    transition: "0.5s"
  },

  player: {
    position: "fixed",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 10
  },

  btn: {
    padding: "10px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer"
  },

  label: {
    marginTop: 15,
    marginBottom: 6,
    fontSize: 12,
    opacity: 0.6
  },

  track: {
    padding: 8,
    cursor: "pointer",
    opacity: 0.8
  }
};
