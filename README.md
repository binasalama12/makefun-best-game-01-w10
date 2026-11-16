[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Alchemist's Cascade

A potion match-3 set in a cozy alchemist's workshop at night. Swap adjacent
ingredient gems — herb leaves, crystals, mushrooms, flames, droplets and star
vials — on an 8×8 board to match 3 or more. Matched gems burst into sparkle
particles and pour into the glowing cauldron beside the board; the brew meter
fills toward the target. Cascades multiply your combo (×2, ×3, ×4…), a match
of 4 brews a bomb flask that clears a 3×3 blast, and a match of 5 brews a
rainbow elixir that clears a whole colour. Reach 1,500 points within 30 moves
to complete the brew — run out of moves short of the target and the brew
fizzles. The board never starts with a ready-made match and always offers a
legal move; if a board ever runs dry it reshuffles with a notice. Behind the
board: wooden shelves crowded with potion bottles, flickering candles, and a
fire-lit cauldron that bubbles harder — and changes colour — as the brew fills.

## Controls

- **Mouse** — click a gem then a neighbour, or drag across a neighbour, to swap
- **Arrow keys + Enter/Space** — move the cursor and select / swap
- **R** — restart
- **Click / Enter** — start from the title screen, play again after the end

## Run it

Plain static files under `game/`, no build step, no dependencies, no network.
Serve the folder with any static server:

```sh
cd game
python3 -m http.server 8000
# then open http://localhost:8000
```

Deterministic screenshot scenes: `?shot=title|play|feature|end&seed=N` — the
page builds the board from the seed, stages the scene, draws it and sets
`window.__shotReady = true`. The same seed always gives the same frame.

Bounty: [make.fun · best-game-01](https://make.fun/bounty/best-game-01)

## License

MIT — see `LICENSE`.
