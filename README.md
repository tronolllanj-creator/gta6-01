[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/tronolllanj-creator/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/tronolllanj-creator/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# SOLMAR BAY — Streets of Solmar Bay

An original open-world crime game for make.fun gta6-01 ("Make GTA 6", $1,666). A complete
rendition of the genre, built from scratch in plain canvas JavaScript — no Rockstar content,
no borrowed assets: Solmar Bay, Mara Voss and every street, car and job are invented.

Mara Voss came home to pay a debt. The Harbor Crew owns her brother's garage — and now they
own her driving. Eight jobs. One way out.

## What's in the world

- **A real city to explore on foot and by car** — grid streets, beach + pier, parks, marina,
  stadium, bank, airfield, hospital, mall; traffic that follows the roads and pedestrians
  who flee a speeding car.
- **Steal and drive cars** — press E beside any car. Sedans, taxis, trucks, vans and the
  Comet GT sports car, each with its own speed and handling. Space is the handbrake.
- **Wanted level + police** — 5 stars. Stealing, shooting and hitting people draw heat;
  Solmar PD interceptors chase and ram you, and on foot they can arrest you. Break line of
  sight to cool off.
- **Missions + story** — 8 jobs from Rosa's Garage (press E there): courier runs, a
  getaway, a dockside fight with the Jackals, a bank score, and the final Marina run.
  Each pays cash; the job board (Tab) tracks them all.
- **Combat** — pistol (click to shoot, ammo crates restock), punching when you're dry,
  rival gang members who shoot back.
- **HUD with minimap** — cash, health, ammo, wanted stars, mission tracker, speedometer,
  live minimap with waypoint beacon, and a synth radio (M mutes).
- **Start screen + save** — title screen, pause, busted/wasted respawn at St. Mara
  Hospital, progress auto-saved in the browser (cash, jobs, kills).

## How to play

- **WASD / arrows** — walk or drive (W accelerate, S brake/reverse, A/D steer)
- **Shift** — sprint on foot · **Space** — handbrake · **E** — enter/exit car, start a job
- **Click** — shoot (on foot) · **Tab** — job board · **P** — pause · **M** — mute

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
# or open game/index.html directly in desktop Chrome — zero network requests, all local
```

Build check: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`

<sub>Entered on [make.fun](https://make.fun/?ref=3bm3ytwk&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
