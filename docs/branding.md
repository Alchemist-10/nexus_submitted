# Nexus identity

The approved **path mark** combines a folded flag with a winding negative-space route. It represents finding an approach to a difficult problem with guidance from a mentor. Its three vector paths reproduce option 4 from the approved light/dark preview.

The existing lowercase `nexus` name, Georgia typography, font weight, letter spacing, and navigation labels are preserved. The interface mark inherits the existing theme accent: burgundy in light mode and pale rose in dark mode.

## Assets

- [Path mark](../public/brand/nexus-mark.svg): standalone burgundy vector.
- [Light-surface wordmark](../public/brand/nexus-wordmark.svg): the mark beside dark serif lettering.
- [Dark-surface wordmark](../public/brand/nexus-wordmark-dark.svg): the mark beside ivory serif lettering.
- [PNG mark](../public/brand/nexus-mark.png): transparent 512 x 512 export.
- Browser icons: `src/app/icon.svg`, `src/app/favicon.ico`, and `src/app/apple-icon.png` use Next.js metadata file conventions. The SVG browser icon adapts to the browser's color scheme; raster fallback icons use burgundy on ivory for reliable contrast.

The exported wordmarks contain outlined Georgia letters. They do not require an installed font or a network font request. The application continues to render its original text rather than substituting an image for the name.

## Usage

Preserve the symbol's aspect ratio and internal negative space. Do not add a tile, stretch, rotate, outline, or add shadows. Allow clear space of at least one quarter of the symbol's width around standalone placements. Use the mark at 24 px or larger in interfaces; dedicated exports cover smaller browser icons.

| Element       | Light mode | Dark mode |
| ------------- | ---------- | --------- |
| Symbol        | `#742d43`  | `#edb1c5` |
| Name          | `#30252a`  | `#f2eae1` |
| Name's period | `#a34e66`  | `#d88eaa` |
| Background    | `#f7f3eb`  | `#191716` |

## Implementation and verification

The shared `ConnectionMark` component supplies the header and footer. Its path data matches the standalone source and the approved preview. Public assets supply the README and downloadable exports; browser metadata supplies tab and home-screen icons.

This is a presentation-only change. Booking, authentication, payments, notifications, and database behavior are unchanged; payments remain in test mode.

Verify the three paths against the approved source, icon metadata and asset loading, the home link, and light/dark navigation at desktop and mobile widths. Run formatting, lint, type checks, and a production build. Verify the staged deployment before promoting it, then inspect the public site and its asset responses.
