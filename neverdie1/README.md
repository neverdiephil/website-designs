# Neverdie Phil — standalone landing page

Extract the entire ZIP and open `index.html` in your browser.
Keep the `resources` folder beside the three main files.

## Files

- `index.html`: page content, links, and metadata.
- `main.css`: consolidated styles, responsive layout, fonts, and effects.
- `main.js`: dependency-free menu and header behavior.
- `resources/fonts/`: the two available custom fonts.
- `resources/images/`: icon, sparks, and lightning images.
- `resources/video/background.mp4`: original background video.

No installation, package manager, build step, account, or server backend is
required. If a browser restricts local files, run a static server from this
folder, such as `python -m http.server 8000 --bind 127.0.0.1`, then open
http://127.0.0.1:8000/ . You can also upload the folder to a static host.

## Cleanup

All presentation styles are consolidated into `main.css`, including the
previous inline layout values. Styles for other pages, unused scripts,
tracking/bootstrap code, duplicated resources, transition wrappers, and
unavailable font declarations have been removed. The original visual CSS
that matches this page and its menu states is retained in cascade order.

The JavaScript is rewritten as readable, scoped native browser code. It
handles the mobile menu, Escape-to-close with focus restoration, desktop
header hover, viewport changes, and the reduced-motion preference. Hidden
mobile links are excluded from keyboard navigation. Autoplay rejection is
handled without interrupting navigation. Links use ordinary browser behavior.

The tilted layout, CSS hover effects, background video, spark/lightning
animations, icon, custom fonts, text, and link destinations are preserved.
The old saved stage dimensions are retained to avoid redesigning the page.
Media files are unchanged. No inactive theme features were reintroduced.

## Editing

Edit link text and destinations in `index.html`. Edit colors, spacing,
perspective, and animation timings in `main.css`. Edit menu behavior in
`main.js`. No files are generated at runtime and no remote assets are loaded.
Social links require internet access. Merch still points to the original
store address and will need updating if that store is removed.

## Verification

Passed JavaScript syntax and behavior checks covering menu toggle, Escape,
focus restoration, viewport reset, header hover, motion preference,
autoplay rejection, and missing optional elements. Passed CSS parsing,
local-resource checks, original link comparison, and media checksum checks.

This cleaned revision has not been rendered in a browser here. Please open
it at desktop and mobile window sizes to confirm the look before replacing
your working copy. The previous archive remains in file version history.
