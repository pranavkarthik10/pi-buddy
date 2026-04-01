# pi-buddy

A Pi extension that ports the Claude Code buddy/companion idea into Pi.

## Features

- `/buddy` to hatch/show your companion
- `/buddy pet`
- `/buddy off`
- `/buddy on`
- `/buddy reroll`
- `/buddy rename <name>`
- `/buddy personality <text>`
- idle sprite animation
- speech bubble reactions
- persistent companion state

## Install

### Global

Copy or symlink this folder into:

```bash
~/.pi/agent/extensions/pi-buddy
```

Pi auto-discovers `index.ts` from there.

### Local testing

```bash
pi -e ./index.ts
```

## Notes

This is an in-progress port. It aims to follow the original buddy behavior:

- sprite near the prompt
- reactions in a speech bubble
- lightweight pet animation
- no heavy card UI for routine commands
