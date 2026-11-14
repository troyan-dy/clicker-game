import type Phaser from 'phaser';

const NODES = [
  'desk', 'desk_empty', 'laptop', 'office', 'tray', 'board', 'handshake', 'studio', 'box', // the blueprint
  'tower', 'datacenter', 'bank', 'garage', 'mall', 'factory', 'admin', 'warehouse', 'rack', 'racks', // the city
  'cityblock', 'parliament', 'military', 'launchpad', 'gpus', 'back_state', // the state
  'island', 'dish', 'hq', 'satellite', 'globe', // the planet
  'person1', 'person2', 'person3', // the laid-off programmers
  'picket1', 'picket2', 'picket3', // …who did not leave
  'robofactory', 'android', 'robodog', 'supermarket', 'coffee', 'barber', 'build', 'taxi', 'pizzeria', 'farm', 'clinic', 'school', // the street
  'back_world', 'earth_night', // the flat world of the last screen, the planet of the ending
  'rest_hammock', 'rest_chess', 'rest_bench', 'rest_fishing', 'rest_picnic', 'rest_easel', // the park
  'ziggurat', 'netcore', 'diesel', 'coalplant', 'gasplant', 'wind', 'solar', 'hydro', 'nuclear', 'fusion', // the ziggurat, the network it feeds, the old power plants
  'drone', 'drone_work', 'drone_towel', 'sleeper1', 'sleeper2', 'sleeper3', // service drones and the shifts on their way to the baths
  'bench', 'pigeon', 'pigeon_peck', 'pigeon_fly', 'sparrow', 'duck', 'seagull', // the bench after the credits
];

/** Loads every node icon once: both the blueprint and the city draw from the same set. */
export function preloadNodes(scene: Phaser.Scene): void {
  for (const key of NODES) scene.load.image(`node_${key}`, `assets/img/nodes/${key}.webp`);
}
