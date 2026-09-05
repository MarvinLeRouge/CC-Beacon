[🇫🇷 Version française](product-context.fr.md) | 🇬🇧 English version

---

# Product Context: CC-Beacon

> Public mirror of the project's internal `PRODUCT.md` (gitignored). Kept in sync manually when the product direction changes.

## Users

A solo developer monitoring their Claude Code sessions from a smartphone. Usage context: on the move, variable lighting, quick glances between tasks. The user knows the tool by heart, they don't need help navigating, they need to read fast.

## Product purpose

CC-Beacon makes Claude Code session work visible remotely: each session writes a structured JSON file (a work) describing its steps, status, and duration. These files are pushed to a VPS and displayed in a minimalist mobile interface, accessible via a token-protected URL.

Success: at a glance from the phone, the user knows where their active tasks stand and how much estimated time is left.

## Brand personality

Functional - Direct - Discreet

The interface steps back behind the data. No frills, no unnecessary chrome. Every element has an operational reason to exist.

## Anti-references

No specific aesthetic to avoid, the compass is "simple, efficient." Any addition that doesn't improve readability or scan speed is superfluous.

## Design principles

1. **Data first** - every visual decision serves the readability of the information, not the appearance of the interface.
2. **Mobile-native** - the target is the smartphone. Desktop is out of scope.
3. **Scan before read** - the user must understand the overall state in under a second, before reading the detail.
4. **Nothing decorative** - if an element doesn't improve understanding or reading speed, it has no place here.

## Accessibility & inclusion

WCAG AA. Minimum contrast 4.5:1 for body text, 3:1 for large text and interface elements. Strictly personal use, but readability in variable conditions (sunlight, dim light) justifies rigor on contrast.
