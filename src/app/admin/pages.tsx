"use client";

import { useEffect, useState } from "react";

type Slide = {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  blurDataURL?: string;
};

const AdminPage = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [status, setStatus] = useState<string>("");
  const [adminKey, setAdminKey] = useState<string>("");

  useEffect(() => {
    fetch("/api/hero-slides")
      .then((r) => r.json())
      .then(setSlides)
      .catch(() => setStatus("Failed to load slides."));
  }, []);

  const updateSlide = (index: number, partial: Partial<Slide>) => {
    setSlides((s) => s.map((slide, i) => (i === index ? { ...slide, ...partial } : slide)));
  };

  const addSlide = () => {
    setSlides((s) => [
      ...s,
      {
        id: `new-${Date.now()}`,
        imageUrl: "",
        alt: "",
        title: "",
        description: "",
        ctaText: "Learn More",
        ctaHref: "/",
      },
    ]);
  };

  const save = async () => {
    if (!adminKey) {
      setStatus("Admin key required.");
      return;
    }
    setStatus("Saving...");
    const res = await fetch("/api/hero-slides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify(slides),
    });
    if (res.ok) setStatus("Saved.");
    else {
      const err = await res.json().catch(() => ({}));
      setStatus("Save failed: " + (err.error || res.status));
    }
  };

  return (
    <div className="container">
      <h1>Hero Slides Admin</h1>
      {status && <p>{status}</p>}

      <div style={{ marginBottom: 16 }}>
        <label>
          Admin Key (from .env):{" "}
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            style={{ width: "100%", maxWidth: 400 }}
          />
        </label>
      </div>

      {slides.map((slide, i) => (
        <div
          key={slide.id}
          style={{
            border: "1px solid #ccc",
            padding: 16,
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <h2>
            Slide {i + 1} <small>({slide.id})</small>
          </h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <label>
                Title
                <input
                  value={slide.title}
                  onChange={(e) => updateSlide(i, { title: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Description
                <textarea
                  value={slide.description}
                  onChange={(e) => updateSlide(i, { description: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Image URL
                <input
                  value={slide.imageUrl}
                  onChange={(e) => updateSlide(i, { imageUrl: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Alt
                <input
                  value={slide.alt}
                  onChange={(e) => updateSlide(i, { alt: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                CTA Text
                <input
                  value={slide.ctaText}
                  onChange={(e) => updateSlide(i, { ctaText: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                CTA Href
                <input
                  value={slide.ctaHref}
                  onChange={(e) => updateSlide(i, { ctaHref: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
            </div>
            <div style={{ flex: "0 0 200px" }}>
              <p>Preview:</p>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  paddingBottom: "50%",
                  background: "#222",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.alt}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#999",
                    }}
                  >
                    no image
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={addSlide} className="button">
          Add Slide
        </button>
        <button onClick={save} className="button">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default AdminPage;
