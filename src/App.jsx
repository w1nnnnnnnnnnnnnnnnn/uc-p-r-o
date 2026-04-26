import React, { useRef, useState, useEffect } from "react";

export default function App() {
  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111");
  const [artist, setArtist] = useState("");

  const audioRef = useRef(null);
  const current = tracks[index];

  /* STORAGE */
  useEffect(() => {
    const saved = localStorage.getItem("music_os_v5");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("music_os_v5", JSON.stringify(projects));
  }, [projects]);

  const [name, setName] = useState("");

  function createProject() {
    if (!name.trim()) return;

    setProjects({
      ...projects,
      [name]: {
        artist: "",
        tracks: []
      }
    });

    setName("");
  }

  function openProject(p) {
    setActive(p);
    setTracks(projects[p]?.tracks || []);
    setArtist(projects[p]?.artist || "");
    setIndex(0);
  }

  function updateProjectData(updatedTracks, newArtist) {
    setProjects({
      ...projects,
      [active]: {
        artist: newArtist ?? artist,
        tracks: updatedTracks
      }
    });
  }

  /* SEARCH */
  const filteredProjects = Object.keys(projects).filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  /* UPLOAD */
  function upload(e) {
    const files = Array.from(e.target.files);

    const newTracks = files.map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(f),
      bpm: Math.floor(Math.random() * 80 + 80),
      cover: null
    }));

    const updated = [...tracks, ...newTracks];
    setTracks(updated);
    updateProjectData(updated, artist);
  }

  /* COVER */
  function uploadCover(e) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const updated = [...tracks];

    if (updated[index]) {
      updated[index].cover = url;
      setTracks(updated);
      updateProjectData(updated, artist);
    }
  }

  /* PLAYER */
  function play(i) {
    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      audioRef.current.src = tracks[i].url;
      audioRef.current.play();
    }, 50);
  }

  function toggle() {
    if (!audioRef.current) return;

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

  /* HOME */
  if (!active) {
    return (
      <div style={styles.home}>

        <div style={styles.logo}>MUSIC OS</div>

        <div style={styles.sub}>
          Projects · Search · Customize · Play
        </div>

        {/* SEARCH */}
        <input
          style={styles.search}
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* CREATE */}
        <div style={styles.createBox}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            style={styles.input}
          />
          <button style={styles.btn} onClick={createProject}>
            Create
          </button>
        </div>

        {/* PROJECTS */}
        <div style={styles.grid}>
          {filteredProjects.length === 0 && (
            <div style={styles.empty}>
              No projects found
            </div>
          )}

          {filteredProjects.map((p) => (
            <div key={p} style={styles.card} onClick={() => openProject(p)}>
              <div>{p}</div>
              <div style={{ opacity: 0.5, fontSize: 12 }}>
                {projects[p].tracks.length} tracks · {projects[p].artist || "No artist"}
              </div>
            </div>
          ))}
        </div>

        {/* SETTINGS */}
        <button style={styles.settingsBtn} onClick={() => setSettingsOpen(!settingsOpen)}>
          ⚙ Settings
        </button>

        {settingsOpen && (
          <div style={styles.settings}>
            <div>Vinyl Color</div>
            <input
              type="color"
              value={vinylColor}
              onChange={(e) => setVinylColor(e.target.value)}
            />
          </div>
        )}

      </div>
    );
  }

  /* APP */
  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>

        <div style={styles.title}>{active}</div>

        <input
          value={artist}
          onChange={(e) => {
            setArtist(e.target.value);
            updateProjectData(tracks, e.target.value);
          }}
          placeholder="Artist name"
          style={styles.input}
        />

        <label style={styles.upload}>
          Upload tracks
          <input type="file" multiple hidden onChange={upload} />
        </label>

        <label style={styles.upload}>
          Upload cover
          <input type="file" hidden onChange={uploadCover} />
        </label>

        <button style={styles.back} onClick={() => setActive(null)}>
          Home
        </button>

        {/* TRACKLIST */}
        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={t.id} style={styles.track} onClick={() => play(i)}>
              {t.name}
              <span style={styles.bpm}>{t.bpm} BPM</span>
            </div>
          ))}
        </div>

      </div>

      {/* VINYL */}
      <div style={styles.center}>

        <div style={styles.vinylWrap}>

          <div
            style={{
              ...styles.vinyl,
              background: `radial-gradient(circle, ${vinylColor}, #000 70%)`,
              animation: playing ? "spin 4s linear infinite" : "none"
            }}
          >

            <div style={styles.grooves} />
            <div style={styles.innerRing} />

            {current?.cover ? (
              <img src={current.cover} style={styles.label} />
            ) : (
              <div style={styles.labelFallback}>{current?.name}</div>
            )}

          </div>

          {/* STYLUS */}
          <div style={playing ? styles.stylusActive : styles.stylus} />

        </div>

      </div>

      {/* PLAYER */}
      <div style={styles.player}>

        <div>{current?.name || "No track"}</div>

        <div style={styles.controls}>
          <button onClick={prev}>⏮</button>
          <button onClick={toggle}>{playing ? "Pause" : "Play"}</button>
          <button onClick={next}>⏭</button>
        </div>

        <audio ref={audioRef} />

      </div>

      {/* ANIMATION */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

/* 🎨 STYLES */
const styles = {

  home: {
    padding: 80,
    textAlign: "center",
    color: "white",
    background: "#0b0b0b",
    minHeight: "100vh"
  },

  logo: { fontSize: 42 },

  sub: { opacity: 0.5, marginBottom: 20 },

  search: {
    padding: 10,
    width: 300,
    marginBottom: 20
  },

  createBox: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
    marginBottom: 40
  },

  input: {
    padding: 10,
    background: "transparent",
    border: "1px solid white",
    color: "white"
  },

  btn: {
    padding: 10,
    background: "white"
  },

  grid: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap"
  },

  card: {
    padding: 20,
    background: "rgba(255,255,255,0.05)",
    cursor: "pointer",
    borderRadius: 10
  },

  settingsBtn: {
    marginTop: 30,
    padding: 10
  },

  settings: {
    marginTop: 10
  },

  app: {
    display: "flex",
    height: "100vh",
    background: "#0b0b0b",
    color: "white"
  },

  sidebar: {
    width: 260,
    padding: 16,
    borderRight: "1px solid #222"
  },

  title: { marginBottom: 10, opacity: 0.6 },

  upload: {
    display: "block",
    padding: 10,
    background: "white",
    color: "black",
    marginTop: 10
  },

  back: { marginTop: 10 },

  list: { marginTop: 20 },

  track: { padding: 6, cursor: "pointer" },

  bpm: { marginLeft: 10, opacity: 0.5, fontSize: 12 },

  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  vinylWrap: {
    position: "relative"
  },

  vinyl: {
    width: 320,
    height: 320,
    borderRadius: "50%",
    position: "relative"
  },

  grooves: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "repeating-radial-gradient(circle, rgba(255,255,255,0.03) 0px, transparent 3px)"
  },

  innerRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  label: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    objectFit: "cover"
  },

  labelFallback: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12
  },

  stylus: {
    position: "absolute",
    width: 60,
    height: 4,
    background: "#888",
    top: 40,
    right: -20,
    transform: "rotate(30deg)"
  },

  stylusActive: {
    position: "absolute",
    width: 60,
    height: 4,
    background: "white",
    top: 40,
    right: -20,
    transform: "rotate(20deg)"
  },

  player: {
    position: "fixed",
    bottom: 0,
    left: 260,
    right: 0,
    height: 70,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    background: "rgba(255,255,255,0.05)"
  },

  controls: {
    display: "flex",
    gap: 10
  }
};
