// Round 2 resubmission: Missions and story lines
// Round 2 resubmission: Job definition data
// Story + missions. Mara Voss, ex-getaway driver, returns to Solmar Bay to pay off her
// brother's debt to the Harbor Crew. Eight jobs, each one step at a time.
export const STORY = {
  title: 'SOLMAR BAY',
  subtitle: 'Streets of Solmar Bay — an original open-world crime story',
  hero: 'Mara Voss',
  intro: 'Mara Voss came home to pay a debt. The Harbor Crew owns her brother\'s garage — and now they own her driving. Eight jobs. One way out.',
};
export const MISSIONS = [
  { id: 1, title: 'Welcome Home', pay: 150, brief: "Rosa needs her driver back. Get to Rosa's Garage.",
    steps: [{ type: 'goto', label: "Drive to Rosa's Garage", x: 264, y: 564, radius: 70 }] },
  { id: 2, title: 'Hot Wheels', pay: 400, brief: 'The Crew wants a Comet GT from the Marina. Steal it — any car will do, but the GT pays full price.',
    steps: [{ type: 'steal', label: 'Steal a sports car (press E by a car)', carType: 'sport', radius: 60 },
            { type: 'goto', label: 'Deliver it to the Garage', x: 264, y: 564, radius: 80, inCar: true }] },
  { id: 3, title: 'Courier Run', pay: 500, brief: 'Three drops, one clock. Deliver the packages before the timer runs out.',
    steps: [{ type: 'timed', label: 'Deliver to the Mall', x: 1464, y: 1464, radius: 70, time: 75 },
            { type: 'timed', label: 'Deliver to the Stadium', x: 2664, y: 1764, radius: 70, time: 75 },
            { type: 'timed', label: 'Deliver to the Airfield', x: 564, y: 2264, radius: 70, time: 75 }] },
  { id: 4, title: 'Heat Wave', pay: 600, brief: 'You were spotted. Lose the cops — survive 45 seconds at wanted level 2 or higher.',
    steps: [{ type: 'escape', label: 'Survive the heat — 45s', time: 45, wanted: 2 }] },
  { id: 5, title: 'Dockside Deal', pay: 800, brief: 'Rival Jackals are muscling Pier 9. Clear them out and grab the cash.',
    steps: [{ type: 'fight', label: 'Clear the Jackals at Pier 9', x: 3300, y: 264, count: 4, radius: 320 },
            { type: 'goto', label: 'Collect the stash', x: 3332, y: 296, radius: 60 }] },
  { id: 6, title: 'Getaway Driver', pay: 900, brief: 'A job went loud at the Bank. Get the crew car from the Bank to the Airfield — fast.',
    steps: [{ type: 'goto', label: 'Reach the Bank', x: 1764, y: 864, radius: 70 },
            { type: 'timed', label: 'Escape to the Airfield', x: 564, y: 2264, radius: 80, time: 90 }] },
  { id: 7, title: 'The Big Score', pay: 1500, brief: 'Rob the Solmar National Bank vault, then lose a 3-star wanted level.',
    steps: [{ type: 'goto', label: 'Reach the Bank vault', x: 1764, y: 864, radius: 70 },
            { type: 'escape', label: 'Lose the 3-star heat — 60s', time: 60, wanted: 3 }] },
  { id: 8, title: 'King of Solmar', pay: 3000, brief: 'One last run: take the Comet GT to the Marina, through everything the Crew can throw at you.',
    steps: [{ type: 'steal', label: 'Take a sports car', carType: 'sport', radius: 60 },
            { type: 'timed', label: 'Deliver to the Grand Marina', x: 3264, y: 2064, radius: 80, time: 100, inCar: true }] },
];
export const CAR_TYPES = [
  { type: 'sedan', name: 'Solmar Sedan', color: '#7fa8c9', speed: 1.0, weight: 1 },
  { type: 'sport', name: 'Comet GT', color: '#e5534b', speed: 1.25, weight: 0.9 },
  { type: 'taxi', name: 'Bay Taxi', color: '#f7c948', speed: 0.95, weight: 1 },
  { type: 'truck', name: 'Harbor Truck', color: '#8a9a5b', speed: 0.85, weight: 1.4 },
  { type: 'van', name: 'Pier Van', color: '#b08968', speed: 0.9, weight: 1.2 },
];
export const FREE_ROAM_TIPS = [
  'Steal any car with E. Wanted stars bring police — break line of sight to cool off.',
  'Cash pickups and health kits spawn around the city. Ammo crates restock your pistol.',
  'Press E at the yellow marker to start the next job. Tab shows the job list.',
];
