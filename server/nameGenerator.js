const adjectives = [
  'Swift', 'Turbo', 'Rapid', 'Lightning', 'Blazing', 'Quick', 'Speedy',
  'Nimble', 'Fleet', 'Brisk', 'Hasty', 'Flying', 'Dashing', 'Racing',
  'Zooming', 'Rushing', 'Soaring', 'Gliding', 'Rocket', 'Hyper'
];

const animals = [
  'Falcon', 'Cheetah', 'Rabbit', 'Dolphin', 'Hawk', 'Cobra', 'Wolf',
  'Panther', 'Eagle', 'Fox', 'Tiger', 'Lynx', 'Jaguar', 'Puma',
  'Gazelle', 'Hare', 'Otter', 'Raven', 'Viper', 'Mongoose'
];

export function generateRandomName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${animal}${num}`;
}
