# NUR LEGENDS: GUARDIANS OF LIGHT

> Fight with Strategy. Lead with Amanah. Win Together.

![Version](https://img.shields.io/badge/version-0.1.0-green)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android-blue)
![Engine](https://img.shields.io/badge/engine-Phaser%203-orange)
![Status](https://img.shields.io/badge/status-In%20Development-yellow)

## 1. PROJECT OVERVIEW

NUR LEGENDS adalah game MOBA Action Strategy
bernuansa Islamic Fantasy yang menggabungkan
strategi, kerja sama tim, petualangan, dan
pendidikan karakter Islami.

Game dikembangkan dengan identitas visual,
karakter, dunia, cerita, dan aset orisinal.

Terinspirasi dari mekanisme umum game bergenre
MOBA tanpa menyalin aset, karakter, logo,
suara, maupun desain game lain.

### Project Information

- Game Name: NUR LEGENDS
- Subtitle: Guardians of Light
- Genre: MOBA Action Strategy
- Art Style: Islamic Fantasy 2.5D
- Camera: Top-down Isometric
- Orientation: Landscape 16:9
- Platform: Web, Mobile, Android (planned)
- Language: Bahasa Indonesia
- Audience: Family-friendly
- Development Status: In Development

## 2. PROJECT VISION

Membangun game MOBA yang menyenangkan,
kompetitif, edukatif, ramah keluarga,
dan membawa nilai-nilai positif.

Core Values:

- Amanah
- Sabar
- Kejujuran
- Keberanian
- Persaudaraan
- Kerja sama
- Sportivitas
- Saling membantu

## 3. GAME STORY

Di sebuah dunia fantasi bernama Nurania,
terdapat kerajaan dengan taman yang indah,
istana megah, gurun, pegunungan, dan
sumber energi kristal bercahaya.

Para Guardian mengikuti pertandingan
strategi untuk menguji kemampuan,
keberanian, dan kekompakan tim.

Setiap tim harus melindungi Energy Core
miliknya sambil menyusun strategi untuk
mengalahkan pertahanan lawan.

Pertandingan merupakan kompetisi fantasi,
bukan peperangan antaragama.

Tidak ada kelompok agama yang digambarkan
sebagai musuh.

## 4. TECHNOLOGY STACK

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Game Engine

- Phaser 3
- HTML5 Canvas
- WebGL
- Arcade Physics
- RequestAnimationFrame

### Local Data

- LocalStorage
- JSON configuration
- Local player profile

### Future Backend

- Node.js
- Socket.IO
- Firebase Authentication
- Firestore or PostgreSQL
- Server-authoritative game simulation

### Future Android Build

- Capacitor
- Android Studio
- APK
- Android App Bundle (AAB)

## 5. CORE GAME FEATURES

### Battle System

- [ ] Real-time combat
- [ ] 5 vs 5 bot gameplay
- [ ] Basic attack
- [ ] Hero abilities
- [ ] Ultimate abilities
- [ ] Health and mana
- [ ] Skill cooldown
- [ ] Damage calculation
- [ ] Healing system
- [ ] Experience and leveling
- [ ] Gold rewards
- [ ] Hero respawn
- [ ] Victory and defeat

### Battlefield

- [ ] Three-lane battlefield
- [ ] Top Lane
- [ ] Mid Lane
- [ ] Bottom Lane
- [ ] Jungle
- [ ] River
- [ ] Bridges
- [ ] Defensive turrets
- [ ] Healing fountain
- [ ] Minion waves
- [ ] Neutral crystal guardians
- [ ] Blue team base
- [ ] Red team base
- [ ] Energy Core
- [ ] Live minimap

### Game Modes

- [ ] Training Mode
- [ ] Practice vs AI
- [ ] Classic 5 vs 5
- [ ] Custom Match
- [ ] Islamic Quiz
- [ ] Survival Challenge
- [ ] Online Multiplayer
- [ ] Ranked Mode

## 6. HERO ROSTER

| Hero | Role | Specialty |
|------|------|-----------|
| Amin | Tank | Protection |
| Faris | Marksman | Ranged Attack |
| Hakim | Mage | Area Damage |
| Zahra | Support | Healing |
| Zaid | Fighter | Mobility |

### AMIN - Guardian

Role: Tank

Abilities:

1. Shield Bash
2. Protective Barrier
3. Guardian Charge
4. Fortress of Light (Ultimate)

### FARIS - Desert Archer

Role: Marksman

Abilities:

1. Energy Arrow
2. Rapid Shot
3. Wind Step
4. Rain of Light (Ultimate)

### HAKIM - Light Weaver

Role: Mage

Abilities:

1. Light Orb
2. Energy Circle
3. Crystal Pulse
4. Radiant Storm (Ultimate)

### ZAHRA - Lifekeeper

Role: Support

Abilities:

1. Healing Aura
2. Team Shield
3. Speed Boost
4. Garden of Renewal (Ultimate)

### ZAID - Wind Striker

Role: Fighter

Abilities:

1. Wind Slash
2. Quick Dash
3. Spinning Strike
4. Desert Cyclone (Ultimate)

## 7. GAMEPLAY RULES

Each match consists of two opposing teams.

Blue Team:
- 1 human player
- 4 allied bots

Red Team:
- 5 enemy bots

Players must:

1. Select a hero.
2. Enter the battlefield.
3. Defeat enemy minions.
4. Collect gold and experience.
5. Upgrade abilities.
6. Purchase equipment.
7. Protect allied structures.
8. Destroy enemy defensive structures.
9. Destroy the opposing Energy Core.

The team that destroys the opposing
Energy Core wins the match.

Defeated heroes dissolve into light
particles and respawn after a delay.

## 8. GAME CONTROLS

### Mobile Controls

- Left Joystick: Movement
- Attack Button: Basic Attack
- Skill 1: Hero Ability
- Skill 2: Hero Ability
- Skill 3: Hero Ability
- Ultimate: Special Ability
- Recall: Return to Base
- Recovery: Restore Health
- Minimap: Battlefield Overview

Mobile controls must support simultaneous
movement and skill activation.

### Desktop Controls

| Key | Action |
|-----|--------|
| W A S D | Movement |
| Space | Basic Attack |
| Q | Skill 1 |
| E | Skill 2 |
| R | Skill 3 |
| F | Ultimate |
| B | Recall |
| H | Recovery |
| Tab | Scoreboard |
| Esc | Pause |

## 9. BOT AI SYSTEM

Bot AI uses a finite-state machine.

Available states:

- IDLE
- MOVE_TO_LANE
- FARM_MINION
- ATTACK_HERO
- ATTACK_TURRET
- DEFEND_BASE
- USE_SKILL
- ASSIST_ALLY
- RETREAT
- HEAL
- RESPAWN

Bots must:

- Follow assigned lanes.
- Navigate around obstacles.
- Farm minions.
- Attack nearby enemies.
- Defend allied structures.
- Retreat when HP is low.
- Support nearby teammates.
- Use abilities intelligently.
- Return to battle after respawn.

Bot AI must run locally.

Do not use paid AI APIs or Gemini API
requests for real-time bot decisions.

## 10. VISUAL DESIGN SYSTEM

### Main Theme

Premium Islamic Fantasy MOBA.

### Color Palette

| Color | HEX |
|-------|-----|
| Emerald Green | #0D7A53 |
| Royal Gold | #D4AF37 |
| Deep Navy | #081525 |
| Ivory | #FFF4DA |
| Turquoise | #39D6C7 |
| Blue Team | #3295FF |
| Red Team | #EF5350 |

### Art Direction

- Stylized 2.5D isometric graphics
- Original faceless fantasy characters
- Modest character costumes
- Golden ornamental frames
- Islamic geometric patterns
- Marble and sandstone architecture
- Crystal energy effects
- Desert gardens and oasis environments
- Smooth movement animations
- Cinematic lighting
- Consistent fantasy RPG iconography

### Typography

- Elegant fantasy heading
- Modern readable body text
- Clear skill cooldown numbers
- High contrast interface
- Consistent font hierarchy

### Visual Restrictions

- No emoji as primary game sprites.
- No copyrighted game assets.
- No graphic violence.
- No blood effects.
- No inappropriate costumes.
- No depiction of sacred figures.
- No Quranic verses as combat spells.

## 11. USER INTERFACE

### Main Lobby

- Player profile
- Hero preview
- Play button
- Hero collection
- Training mode
- Missions
- Islamic Quiz
- Battle history
- Settings
- Fullscreen button

### Battle HUD

- Live minimap
- Health bar
- Mana bar
- Hero level
- Team score
- Match timer
- Gold counter
- Virtual joystick
- Basic attack button
- Skill buttons
- Cooldown indicators
- Item shop
- Scoreboard
- Pause menu

### Result Screen

- Victory or Defeat
- Hero statistics
- Total damage
- Healing contribution
- Teamwork score
- Gold earned
- Experience earned
- Return to Lobby
- Play Again

All visible buttons must be functional.

Hide unfinished features until implemented.

## 12. ISLAMIC EDUCATIONAL SYSTEM

Educational features are separated from
the real-time combat system.

### Quiz Categories

- Rukun Islam
- Rukun Iman
- Adab sehari-hari
- Akhlak terpuji
- Sejarah Islam
- Pengetahuan Islam dasar
- Kebersihan
- Persaudaraan

### Quiz Features

- Multiple-choice questions
- Answer explanations
- Correct answer indicator
- Learning progress
- Educational badges
- Daily learning challenges

Religious content must be reviewed for
accuracy using reliable references before
being published.

Educational progress must not provide
unfair advantages in competitive combat.

### Ethical Guidelines

- Do not depict prophets or angels.
- Do not depict Allah.
- Do not use sacred verses as weapons.
- Do not use mosques as battle targets.
- Do not turn worship into combat magic.
- No gambling or random paid loot boxes.
- No discrimination or religious hatred.
- No graphic violence.
- Encourage respectful sportsmanship.

## 13. PROPOSED PROJECT STRUCTURE

The following structure is a development
target and may be adjusted to match the
actual generated project.

nur-legends/
├── README.md
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .gitignore
├── public/
│   ├── assets/
│   │   ├── heroes/
│   │   ├── maps/
│   │   ├── minions/
│   │   ├── turrets/
│   │   ├── icons/
│   │   ├── effects/
│   │   ├── audio/
│   │   └── ui/
│   └── favicon.svg
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Lobby.tsx
│   │   ├── HeroSelect.tsx
│   │   ├── BattleHUD.tsx
│   │   ├── Joystick.tsx
│   │   ├── SkillButton.tsx
│   │   ├── Minimap.tsx
│   │   ├── ItemShop.tsx
│   │   └── ResultScreen.tsx
│   ├── game/
│   │   ├── GameConfig.ts
│   │   ├── GameEngine.ts
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── PreloadScene.ts
│   │   │   └── BattleScene.ts
│   │   ├── entities/
│   │   │   ├── Hero.ts
│   │   │   ├── Minion.ts
│   │   │   ├── Turret.ts
│   │   │   └── Projectile.ts
│   │   ├── systems/
│   │   │   ├── CombatSystem.ts
│   │   │   ├── SkillSystem.ts
│   │   │   ├── BotAI.ts
│   │   │   ├── SpawnSystem.ts
│   │   │   ├── ItemSystem.ts
│   │   │   ├── CollisionSystem.ts
│   │   │   └── ProgressionSystem.ts
│   │   └── maps/
│   │       └── NuraniaArena.ts
│   ├── data/
│   │   ├── heroes.json
│   │   ├── items.json
│   │   ├── skills.json
│   │   └── quiz.json
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── styles/
└── tests/

## 14. INSTALLATION

Prerequisites:

- Node.js supported by the project
- npm
- Modern web browser

Install project dependencies:

    npm install

Run development server:

    npm run dev

Create production build:

    npm run build

Preview production build:

    npm run preview

If testing is configured:

    npm run test

Commands must match the actual scripts
defined in package.json.

## 15. PERFORMANCE REQUIREMENTS

- Target 30-60 FPS.
- Optimize for mid-range Android devices.
- Use object pooling.
- Optimize texture sizes.
- Reuse particle emitters.
- Limit active projectiles.
- Use efficient collision detection.
- Use delta-time based movement.
- Avoid unnecessary React re-rendering.
- Clean up event listeners.
- Destroy unused Phaser game instances.
- Pause rendering when appropriate.
- Provide Low, Medium, High graphics modes.

The game must remain responsive during
large team battles.

## 16. DATA STORAGE

LocalStorage may store:

- Player profile
- Player level
- Experience
- Selected hero
- Unlocked heroes
- Settings
- Battle history
- Quiz progress
- Achievement badges

Use versioned save data.

Validate saved data before loading it.

Do not store passwords or private API keys
in LocalStorage.

Future competitive multiplayer progression
must be validated on the server.

## 17. DEVELOPMENT ROADMAP

### Phase 1 - Playable Prototype

- [ ] Project initialization
- [ ] Phaser engine integration
- [ ] One playable hero
- [ ] One playable lane
- [ ] Virtual joystick
- [ ] Basic attack
- [ ] Enemy bots
- [ ] Minion spawning
- [ ] Turret defense
- [ ] Health system
- [ ] Respawn
- [ ] Victory and defeat

### Phase 2 - Full MOBA

- [ ] Three-lane arena
- [ ] Five unique heroes
- [ ] 5 vs 5 bot matches
- [ ] Skills and ultimates
- [ ] Item shop
- [ ] Gold and EXP
- [ ] Jungle monsters
- [ ] Improved bot AI
- [ ] Minimap

### Phase 3 - Premium Visuals

- [ ] Animated main lobby
- [ ] Hero selection
- [ ] HD character sprites
- [ ] Premium skill effects
- [ ] Environment animation
- [ ] Sound effects
- [ ] Graphics settings
- [ ] Additional heroes
- [ ] Original hero skins

### Phase 4 - Educational Features

- [ ] Islamic Quiz
- [ ] Daily learning missions
- [ ] Achievement badges
- [ ] Teamwork rewards
- [ ] Reviewed educational content

### Phase 5 - Online Multiplayer

- [ ] Authentication
- [ ] Online game server
- [ ] Private rooms
- [ ] Matchmaking
- [ ] Real-time synchronization
- [ ] Reconnection system
- [ ] Server-side combat validation
- [ ] Anti-cheat
- [ ] Leaderboard

### Phase 6 - Android Release

- [ ] Capacitor integration
- [ ] Android project setup
- [ ] Touch optimization
- [ ] Device compatibility
- [ ] APK build
- [ ] AAB build
- [ ] Privacy policy
- [ ] Play Store preparation

## 18. TESTING CHECKLIST

### Gameplay

- [ ] Hero can move freely.
- [ ] Camera follows the player.
- [ ] Basic attack works.
- [ ] Skills deal correct damage.
- [ ] Cooldowns work correctly.
- [ ] Health and mana update correctly.
- [ ] Minions spawn automatically.
- [ ] Bots move and attack.
- [ ] Turrets select valid targets.
- [ ] Heroes respawn correctly.
- [ ] Energy Core can be destroyed.
- [ ] Match ends correctly.
- [ ] Restart match works.

### Mobile

- [ ] Landscape layout works.
- [ ] Joystick responds correctly.
- [ ] Multi-touch works.
- [ ] No accidental page scrolling.
- [ ] Buttons are readable.
- [ ] HUD respects safe areas.
- [ ] Performance is acceptable.

### Application

- [ ] No TypeScript errors.
- [ ] No console errors.
- [ ] No broken imports.
- [ ] No missing required assets.
- [ ] No unnecessary API requests.
- [ ] LocalStorage works.
- [ ] Production build succeeds.

Only mark checklist items as completed
after successful implementation and testing.

## 19. AI DEVELOPER INSTRUCTIONS

IMPORTANT:

All AI coding assistants working on this
project must follow these instructions.

1. Read README.md before modifying code.

2. Understand the existing project
   architecture before adding features.

3. Preserve all working gameplay systems.

4. Never replace playable gameplay with
   static mockups or decorative screens.

5. Do not rewrite the entire project
   unless explicitly requested.

6. Implement features incrementally.

7. Fix the root cause of errors.

8. Keep TypeScript types consistent.

9. Avoid duplicated game logic.

10. Keep game configurations centralized.

11. Separate game logic from React UI.

12. Do not place the real-time game loop
    inside React component state updates.

13. Do not create fake buttons,
    placeholder actions, or fake statistics.

14. Never expose API keys or secrets.

15. Preserve mobile responsiveness.

16. Preserve original visual identity.

17. Avoid copyrighted game assets.

18. Use original placeholder graphics
    when final assets are unavailable.

19. Ensure the game remains playable
    after every update.

20. Run available build and test commands
    after implementing major features.

21. Do not claim tests passed unless
    they were actually executed.

22. Update documentation whenever
    project architecture changes.

23. Keep bot mode functional even after
    online multiplayer is introduced.

24. Do not introduce paid API dependencies
    without developer approval.

25. Prioritize functional gameplay over
    decorative features.

## 20. DEFINITION OF DONE

A feature is considered complete when:

- Implementation is functional.
- TypeScript compilation succeeds.
- Relevant tests pass.
- No known blocking runtime errors exist.
- Mobile controls remain functional.
- Existing gameplay is not broken.
- Performance remains acceptable.
- Documentation is updated.
- Actual results are reported honestly.

## 21. SECURITY

- Never hardcode secrets.
- Use environment variables when needed.
- Keep private keys on the server.
- Validate player input.
- Sanitize user-generated content.
- Validate multiplayer actions server-side.
- Rate-limit online requests.
- Minimize personal data collection.
- Provide moderation for online features.

The offline game must not require
authentication or external AI services.

## 22. MONETIZATION POLICY

Future optional monetization:

- Cosmetic hero skins
- Cosmetic effects
- Decorative avatars
- Profile banners
- Transparent fixed-price purchases

Restrictions:

- No gambling mechanics.
- No paid randomized loot boxes.
- No pay-to-win equipment.
- No misleading purchase interfaces.
- No manipulative countdowns.
- No purchases required for learning.

## 23. ASSET POLICY

All visual and audio assets must be:

- Original
- Procedurally generated
- Properly licensed
- Public domain where applicable
- Approved for intended commercial use

Record external asset sources and
their licenses before distribution.

## 24. LICENSE

Project license: To be determined by
the project owner.

Third-party dependencies and assets
retain their respective licenses.

## 25. CHANGELOG

### v0.1.0 - Initial Planning

- Defined project vision.
- Designed five initial heroes.
- Planned MOBA gameplay systems.
- Established visual design direction.
- Defined ethical guidelines.
- Created development roadmap.

Future versions must document:

- Added features
- Bug fixes
- Performance improvements
- Breaking changes
- Known issues

## 26. PROJECT MOTTO

"Strategy, Brotherhood, and Amanah."

NUR LEGENDS: GUARDIANS OF LIGHT

Built with creativity.
Designed for teamwork.
Inspired by positive Islamic values.
