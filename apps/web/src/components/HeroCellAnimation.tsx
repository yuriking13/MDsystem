import React, { useState, useEffect } from "react";
import "../styles/hero-cell-animation.css";

/* ------------------------------------------------------------------ */
/*  Animated cell‑biology storyline for the Hero block                */
/*  Sequence:                                                         */
/*    1. Healthy center cell appears; two T‑cells orbit around it     */
/*    2. Center cell ➜ attacked version (full colour); T‑cells flee   */
/*    3. Caudal (bottom‑left) & cranial (top‑right) cells appear      */
/*    4–6. Three protein volleys fly from corners to centre            */
/*    7. Attacked centre cell fades out                               */
/*    8. Corner cells fade out                                        */
/*    9. Short pause → loop                                           */
/* ------------------------------------------------------------------ */

const CDN = "https://storage.yandexcloud.net/scentiaiterpublic/landing";

const IMG = {
  center: `${CDN}/center_cell.png`,
  attacked: `${CDN}/attacked_center_cell.png`,
  tCell: `${CDN}/t-cell.png`,
  caudal: `${CDN}/caudal_cell.png`,
  cranial: `${CDN}/cranial_cell.png`,
  caudalP1: `${CDN}/caudal_cell_1gr_proteins.png`,
  caudalP2: `${CDN}/caudal_cell_2gr_proteins.png`,
  cranialP1: `${CDN}/cranial_cell_1gr_proteins.png`,
  cranialP2: `${CDN}/cranial_cell_2gr_proteins.png`,
} as const;

type Phase =
  | "idle"
  | "attacked"
  | "corners-in"
  | "attack-1"
  | "attack-2"
  | "attack-3"
  | "center-fade"
  | "corners-fade"
  | "reset";

const SEQUENCE: { phase: Phase; duration: number }[] = [
  { phase: "idle", duration: 2000 },
  { phase: "attacked", duration: 1600 },
  { phase: "corners-in", duration: 1200 },
  { phase: "attack-1", duration: 1400 },
  { phase: "attack-2", duration: 1400 },
  { phase: "attack-3", duration: 1400 },
  { phase: "center-fade", duration: 1200 },
  { phase: "corners-fade", duration: 1200 },
  { phase: "reset", duration: 800 },
];

export default function HeroCellAnimation() {
  const [stepIdx, setStepIdx] = useState(0);

  const { phase, duration } = SEQUENCE[stepIdx];

  /* Advance through the timeline */
  useEffect(() => {
    const timer = setTimeout(
      () => setStepIdx((i) => (i + 1) % SEQUENCE.length),
      duration,
    );
    return () => clearTimeout(timer);
  }, [stepIdx, duration]);

  /* Preload every image once */
  useEffect(() => {
    Object.values(IMG).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  /* Which attack volley is active (1 | 2 | 3 | 0) */
  const attackNum =
    phase === "attack-1"
      ? 1
      : phase === "attack-2"
        ? 2
        : phase === "attack-3"
          ? 3
          : 0;

  return (
    <div className="hca" data-phase={phase} aria-hidden="true">
      {/* ── Healthy centre cell ── */}
      <img
        src={IMG.center}
        alt=""
        className="hca-img hca-center hca-center-healthy"
      />

      {/* ── Attacked centre cell (full colour) ── */}
      <img
        src={IMG.attacked}
        alt=""
        className="hca-img hca-center hca-center-attacked"
      />

      {/* ── Orbiting T‑cells ── */}
      <div className="hca-orbit-ring">
        <div className="hca-tcell-slot hca-tcell-slot-1">
          <img src={IMG.tCell} alt="" className="hca-img hca-tcell" />
        </div>
        <div className="hca-tcell-slot hca-tcell-slot-2">
          <img src={IMG.tCell} alt="" className="hca-img hca-tcell" />
        </div>
      </div>

      {/* ── Corner cells ── */}
      <img src={IMG.caudal} alt="" className="hca-img hca-corner hca-caudal" />
      <img
        src={IMG.cranial}
        alt=""
        className="hca-img hca-corner hca-cranial"
      />

      {/* ── Protein volleys (re‑mount per attack to restart animation) ── */}
      {attackNum > 0 && (
        <>
          <img
            key={`cp-${attackNum}`}
            src={attackNum % 2 === 1 ? IMG.caudalP1 : IMG.caudalP2}
            alt=""
            className="hca-img hca-protein hca-protein-caudal"
          />
          <img
            key={`rp-${attackNum}`}
            src={attackNum % 2 === 1 ? IMG.cranialP1 : IMG.cranialP2}
            alt=""
            className="hca-img hca-protein hca-protein-cranial"
          />
        </>
      )}
    </div>
  );
}
