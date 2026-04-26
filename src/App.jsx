import React, { useEffect, useRef, useState } from "react";

export default function App() {
  /* ================= AUTH ================= */

  const [view, setView] = useState(() => {
    return localStorage.getItem("aurae_remember") ? "home" : "auth";
  });

  const [users, setUsers] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_users") || "{}")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  /* ================= DATA ================= */

  const [projects, setProjects] = useState(() =>
    JSON.parse(localStorage.getItem("aurae_projects") || "{}")
  );

  const [activeProject, setActiveProject] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [vinylColor, setVinylColor] = useState("#111111");

  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef(null);

  const current = tracks[index];
  const project = projects[activeProject] || {};

  /* ================= HELPERS ================= */

  function saveProjects(next) {
    setProjects(next);
    localStorage.setItem("aurae_projects", JSON.stringify(next));
  }

  function formatTime(sec = 0) {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function totalDuration(list = []) {
    const sum = list.reduce((acc, t) => acc + (t.duration || 0), 0);
    return formatTime(sum);
  }

  function remainingTime() {
    if (!current) return "0:00";
    return formatTime(
      Math.max(0, (current.duration || 0) - currentTime)
    );
  }

  /* ================= AUTH ================= */

  function signup() {
    if (!email || !password) return;

    const next = {
      ...users,
      [email]: { password }
    };

    setUsers(next);
    localStorage.setItem("aurae_users", JSON.stringify(next));

    login();
  }

  function login() {
    if (!users[email] || users[email].password !== password) {
      alert("wrong login");
      return;
    }

    if (remember) {
      localStorage.setItem("aurae_remember", email);
    }

    setView("home");
  }

  function logout() {
    localStorage.removeItem("aurae_remember");
    setView("auth");
  }

  /* ================= PROJECTS ================= */

  function createProject() {
    const name = prompt("project name");
    if (!name) return;

    const next = {
      ...projects,
      [name]: { tracks: [], cover: null }
    };

    saveProjects(next);
  }

  function openProject(name) {
    setActiveProject(name);
    setTracks(projects[name]?.tracks || []);
    setIndex(0);
    setPlaying(false);
    setView("studio");
  }

  function updateTracks(list) {
    setTracks(list);

    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        tracks: list,
        cover: projects[activeProject]?.cover || null
      }
    };

    saveProjects(next);
  }

  function setProjectCover(e) {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    const url = URL.createObjectURL(file);

    const next = {
      ...projects,
      [activeProject]: {
        ...projects[activeProject],
        cover: url
      }
    };

    saveProjects(next);
  }

  /* ================= MULTI TRACK UPLOAD ================= */

  async function addTracks(e) {
    const files = Array.from(e.target.files || []);

    const loaded = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const probe = new Audio(url);

            probe.addEventListener("loadedmetadata", () => {
              resolve({
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                url,
                duration: probe.duration || 0,
                cover: null
              });
            });
          })
      )
    );

    updateTracks([...tracks, ...loaded]);
  }

  function addCover(e) {
    const file = e.target.files?.[0];
    if (!file || !tracks[index]) return;

    const updated = [...tracks];
    updated[index].cover = URL.createObjectURL(file);

    updateTracks(updated);
  }

  /* ================= PLAYER ================= */

  function play(i) {
    if (!tracks[i]) return;

    setIndex(i);
    setPlaying(true);

    setTimeout(() => {
      const a = audioRef.current;
      a.src = tracks[i].url;
      a.play().catch(() => {});
    }, 30);
  }

  function toggle() {
    const a = audioRef.current;

    if (!a.src && tracks[0]) {
      play(0);
      return;
    }

    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().catch(() => {});
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
    if (!a) return;

    const time = () => setCurrentTime(a.currentTime || 0);
    const ended = () => {
      if (index < tracks.length - 1) play(index + 1);
      else setPlaying(false);
    };

    a.addEventListener("timeupdate", time);
    a.addEventListener("ended", ended);

    return () => {
      a.removeEventListener("timeupdate", time);
      a.removeEventListener("ended", ended);
    };
  }, [index, tracks]);

  /* ================= UI ================= */

  if (view === "auth") {
    return (
      <div style={styles.auth}>
        <div style={styles.panel}>
          <div style={styles.logo}>AURAE</div>

          <input
            style={styles.input}
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label style={styles.row}>
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <span>remember me</span>
          </label>

          <button style={styles.btn} onClick={login}>
            login
          </button>

          <button style={styles.btn} onClick={signup}>
            sign up
          </button>
        </div>
      </div>
    );
  }

  if (view === "home") {
    return (
      <div style={styles.home}>
        <div style={styles.centerHome}>
          <div style={styles.logo}>AURAE OS</div>

          <button style={styles.btn} onClick={createProject}>
            + new project
          </button>

          <div style={styles.grid}>
            {Object.keys(projects).map((name) => {
              const list = projects[name]?.tracks || [];

              return (
                <div
                  key={name}
                  style={{
                    ...styles.card,
                    backgroundImage: projects[name]?.cover
                      ? `url(${projects[name].cover})`
                      : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}
                  onClick={() => openProject(name)}
                >
                  <div>{name}</div>
                  <div style={styles.meta}>
                    {list.length} tracks • {totalDuration(list)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h3>{activeProject}</h3>

        <label style={styles.btn}>
          project cover
          <input
            hidden
            type="file"
            accept="image/*"
            onChange={setProjectCover}
          />
        </label>

        <label style={styles.btn}>
          add tracks
          <input
            hidden
            type="file"
            multiple
            accept=".mp3,.wav"
            onChange={addTracks}
          />
        </label>

        <div style={styles.meta}>
          {tracks.length} tracks • {totalDuration(tracks)}
        </div>

        <div style={styles.list}>
          {tracks.map((t, i) => (
            <div key={t.id} style={styles.track} onClick={() => play(i)}>
              <span>{t.name}</span>
              <span>{formatTime(t.duration)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.stage}>
        <div style={styles.vinyl}>
          {current?.cover || project.cover ? (
            <img
              src={current?.cover || project.cover}
              style={styles.labelImg}
            />
          ) : (
            <div style={styles.labelFallback}>
              {current?.name || "AURAE"}
            </div>
          )}
        </div>
      </div>

      <div style={styles.player}>
        <button onClick={prev}>⏮</button>
        <button onClick={toggle}>{playing ? "pause" : "play"}</button>
        <button onClick={next}>⏭</button>

        <div>
          {current?.name} • {remainingTime()}
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}
