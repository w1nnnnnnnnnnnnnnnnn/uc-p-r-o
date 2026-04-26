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
        name: file.name,
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
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", padding: 20 }}>
      
      <h1>UC PLAYER</h1>

      <audio ref={audioRef} controls style={{ width: "100%" }} />

      <input type="file" accept="audio/*" hidden id="file" onChange={upload} />

      <button onClick={() => document.getElementById("file").click()}>
        Upload MP3 / WAV
      </button>

      <div style={{ marginTop: 20 }}>
        {tracks.map((t, i) => (
          <div
            key={t.id}
            style={{
              padding: 10,
              border: "1px solid #333",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <span>{t.name}</span>
            <button onClick={() => play(t, i)}>Play</button>
          </div>
        ))}
      </div>

    </div>
  );
}
