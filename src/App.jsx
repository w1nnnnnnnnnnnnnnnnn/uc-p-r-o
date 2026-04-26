import React, { useRef, useState } from "react";

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);

  const audioRef = useRef(null);

  function upload(e) {
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);

    setTracks([
      {
        id: Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        url
      },
      ...tracks
    ]);
  }

  function play(track, i) {
    setCurrent(i);
    audioRef.current.src = track.url;
    audioRef.current.play();
  }

  return (
    <div style={styles.app}>
      
      {/* LEFT SIDE */}
      <div style={styles.left}>
        <div style={styles.logo}>UC</div>

        <input
          type="file"
          accept="audio/*"
          hidden
          id="file"
          onChange={upload}
        />

        <button style={styles.uploadBtn} onClick={() => document.getElementById("file").click()}>
          Upload
        </button>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div
              key={t.id}
              style={{
                ...styles.track,
                opacity: current === i ? 1 : 0.6,
                transform: current === i ? "scale(1.02)" : "scale(1)"
              }}
              onClick={() => play(t, i)}
            >
              {t.name}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>
        <audio ref={audioRef} controls style={styles.player} />

        <div style={styles.vinylWrapper}>
          <div
            style={{
              ...styles.vinyl,
              transform: current !== null ? "rotate(360deg)" : "rotate(0deg)"
            }}
          />
        </div>

        <div style={styles.hint}>
          Drop music → Play → vibe 🎧
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    height: "100vh",
    display: "flex",
    background: "#0a0a0a",
    color: "white",
    fontFamily: "system-ui"
  },

  left: {
    width: "30%",
    borderRight: "1px solid #222",
    padding: 20
  },

  logo: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20
  },

  uploadBtn: {
    width: "100%",
    padding: 10,
    background: "#111",
    border: "1px solid #333",
    color: "white",
    cursor: "pointer",
    marginBottom: 20
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },

  track: {
    padding: 12,
    background: "#111",
    borderRadius: 8,
    cursor: "pointer",
    transition: "0.2s"
  },

  right: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },

  player: {
    width: "60%",
    marginBottom: 40
  },

  vinylWrapper: {
    width: 260,
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30
  },

  vinyl: {
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "radial-gradient(circle, #111 20%, #000 70%)",
    border: "2px solid #333",
    transition: "1s linear"
  },

  hint: {
    opacity: 0.4,
    fontSize: 14
  }
};
