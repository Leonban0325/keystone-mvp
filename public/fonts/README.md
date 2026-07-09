# Deck fonts (licensed, self-hosted)

- Intro-Black-Alt.otf / Intro-Bold-Alt.otf — the INTRO display face for deck
  headlines (loaded via @font-face in src/index.css; a runtime check in the
  deck logs a console error if INTRO fails to load — it never falls back
  silently).
- Poppins-{Light,Regular,Medium,SemiBold,Italic}.ttf — deck body/labels/data
  (weights 300/400/500/600), self-hosted so the deck works fully offline.
