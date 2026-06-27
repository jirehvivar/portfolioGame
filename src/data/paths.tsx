import * as THREE from "three";
import { LANDMARKS } from "./projects";
import type { LandmarkId } from "../types";

/**
 * Curved terracotta trail geometry, connecting the spawn clearing to every
 * landmark. Each trail is a quadratic Bezier: starts near Glowpuff's spawn,
 * bows out sideways through a control point (the "wander"), ends at the
 * landmark. From the curve we derive a flat ribbon (dirt underlay) and a set
 * of evenly-spaced stone transforms.
 */

const HUB: [number, number] = [0, 6];

const BEND: Record<LandmarkId, number> = {
  greenhouse: 3.5,
  pianoRoom: -3.5,
  observatory: 4,
};

const PATH_WIDTH = 2.2;
const STONE_SPACING = 1.15;
const STONE_JITTER = 0.35;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(778899);

export interface StoneTransform {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface PathData {
  id: LandmarkId;
  ribbonGeometry: THREE.BufferGeometry;
  stones: StoneTransform[];
}

function buildCurve(target: [number, number], bend: number): THREE.QuadraticBezierCurve3 {
  const start = new THREE.Vector3(HUB[0], 0, HUB[1]);
  const end = new THREE.Vector3(target[0], 0, target[1]);
  const mid = start.clone().lerp(end, 0.5);
  const dir = end.clone().sub(start).normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const ctrl = mid.add(perp.multiplyScalar(bend));
  return new THREE.QuadraticBezierCurve3(start, ctrl, end);
}

function buildRibbon(curve: THREE.QuadraticBezierCurve3, width: number): THREE.BufferGeometry {
  const divisions = 60;
  const points = curve.getPoints(divisions);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const halfW = width / 2;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = curve.getTangent(i / (points.length - 1));
    const perp = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const left = p.clone().add(perp.clone().multiplyScalar(halfW));
    const right = p.clone().add(perp.clone().multiplyScalar(-halfW));
    positions.push(left.x, 0.012, left.z);
    positions.push(right.x, 0.012, right.z);
    const v = i / (points.length - 1);
    uvs.push(0, v, 1, v);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2);
    indices.push(a + 1, a + 3, a + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function sampleStones(curve: THREE.QuadraticBezierCurve3): StoneTransform[] {
  const length = curve.getLength();
  const count = Math.floor(length / STONE_SPACING);
  const stones: StoneTransform[] = [];
  const points = curve.getSpacedPoints(count);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const t = curve.getTangent(i / (points.length - 1));
    const perp = new THREE.Vector3(-t.z, 0, t.x).normalize();
    const jitter = (rand() - 0.5) * 2 * STONE_JITTER;
    stones.push({
      position: [p.x + perp.x * jitter, 0.02, p.z + perp.z * jitter],
      rotationY: rand() * Math.PI * 2,
      scale: 0.85 + rand() * 0.5,
    });
  }
  return stones;
}

export const PATHS: PathData[] = LANDMARKS.map((lm) => {
  const curve = buildCurve(lm.position, BEND[lm.id]);
  return {
    id: lm.id,
    ribbonGeometry: buildRibbon(curve, PATH_WIDTH),
    stones: sampleStones(curve),
  };
});