import type Phaser from 'phaser';

const NODES = [
  'desk', 'laptop', 'office', 'tray', 'board', 'handshake', 'studio', 'box', // the blueprint
  'tower', 'datacenter', 'bank', 'garage', 'mall', 'factory', 'admin', 'warehouse', 'rack', 'racks', // the city
  'cityblock', 'parliament', 'military', 'launchpad', 'gpus', 'back_state', // the state
  'island', 'dish', 'hq', 'satellite', 'globe', // the planet
];

/** Loads every node icon once: both the blueprint and the city draw from the same set. */
export function preloadNodes(scene: Phaser.Scene): void {
  for (const key of NODES) scene.load.image(`node_${key}`, `assets/img/nodes/${key}.webp`);
}
