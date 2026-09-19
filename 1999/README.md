# Retro TV Website — Knob Navigation

This version builds on the perspective-matched TV prototype and turns the photographed
top dial into the site navigation control.

## Channels

1. Home
2. Posts
3. About Me
4. Contact Us

Clicking the large top knob advances to the next channel. The page labels around the
knob are hidden for a cleaner, more authentic TV appearance.

Keyboard support while the knob is focused:

- Right / Down: next channel
- Left / Up: previous channel
- Home: Home page
- End: Contact page
- Enter / Space: next channel

Each page also has a URL hash (`#home`, `#posts`, `#about`, `#contact`) so channels can
be linked directly and browser Back/Forward navigation works.

## How the physical knob works

`res/channel-knob.png` is a 54×54 crop taken directly from the original `80stv.png`.
It is positioned precisely over the photographed top dial and rotated with CSS. At
0 degrees it visually matches the original artwork, so the overlay blends into the TV.

A very small pointer dot is added because the original center stripe is nearly
symmetrical and would otherwise make the selected detent ambiguous.

## Files

- `index.html` — page content and channel controls
- `main.css` — TV perspective, CRT styling, knob positioning and animation
- `main.js` — navigation, knob rotation, history and keyboard behavior
- `res/80stv.webp` — original TV frame
- `res/channel-knob.png` — extracted rotating knob face

## Fine tuning

The knob position is controlled near the top of `main.css`:

```css
--knob-hit-left: 65.18%;
--knob-hit-top: 15.52%;
--knob-hit-size: 6.95%;
```

The actual rotating photograph within the larger click target uses:

```css
--knob-face-left: 11.8%;
--knob-face-top: 11.7%;
--knob-face-size: 76.4%;
```

The four label positions are under `.channel-label--home`, `.channel-label--posts`,
`.channel-label--about`, and `.channel-label--contact`.


## VHS tracking effect

A fuzzy tracking band now sweeps from the bottom of the CRT to the top at irregular
intervals (roughly every 5–14 seconds). While the band is visible, the image shifts
slightly left/right and the scanline layer distorts briefly to mimic an analog VHS
tracking error.

The effect respects `prefers-reduced-motion`; when reduced motion is enabled the
tracking sweep is disabled.


## Responsive mobile Game Boy layout

At viewport widths of **760px or below**, the desktop television is hidden and the
site switches to the supplied scratched Game Boy Color photograph.

The same page markup is cloned into the Game Boy LCD at runtime, so desktop and mobile
cannot drift into separate copies of the site's content.

Mobile controls:

- **A**: next page
- **B**: previous page
- **D-pad left/right**: previous/next page
- **D-pad up/down**: scroll the current page
- **START**: return to Home
- The LCD itself remains touch-scrollable

The physical button graphics are not replaced. Transparent accessible hit targets are
aligned over the photographed controls, so the user appears to operate the actual Game
Boy in the image.

The Game Boy LCD is translucent so the original scratches and aging in the supplied
photo remain visible through the website content. Desktop VHS effects are automatically
paused on mobile.


## Landscape Tamagotchi mode

On compact devices in landscape orientation (`max-height: 600px`, `max-width: 1200px`)
the TV and portrait Game Boy are both replaced by a full-viewport Tamagotchi-style LCD.

The landscape mode is interactive:

- Four pixel-style icons across the top jump directly to Home, Posts, About, and Contact.
- Left round button: previous page.
- Middle round button: Home.
- Right round button: next page.
- The content panel remains directly touch-scrollable.
- A small pixel pet animates in the lower-right corner.
- Page changes use a short LCD-style flicker/jitter transition.

The same canonical page markup is cloned into the Tamagotchi screen at runtime, just as
with the portrait Game Boy. Desktop, portrait-mobile, and landscape-mobile therefore
share a single source of page content.

The Tamagotchi-style landscape mode is drawn with CSS and uses no additional image asset.