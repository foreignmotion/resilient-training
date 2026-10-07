# Reading the prototype

These three files are the approved designs, exported from a Claude Design canvas:

| File | Route |
|---|---|
| `Main.dc.html` | `/` |
| `NCRT.dc.html` | `/ncrt` |
| `Register.dc.html` | `/register` (+ confirmed state) |

They will **not** open correctly in a browser by themselves. They use a prototype templating format:

- `<x-dc>` wraps the page markup. `<helmet><style>` holds the page CSS.
- `<x-import component-from-global-scope="NCRT.Button" …>` mounts a component from `../design/ncrt-components/bundle.js`. Attributes are props in kebab-case (`class-name="solid"` → `className`, `on-click` → `onClick`). Element content is `children`.
- `<sc-if value="{{ x }}">` is a conditional; `<sc-for list="{{ items }}" as="item">` is a loop; `{{ path }}` is a value from `renderVals()`.
- The `<script type="text/x-dc">` at the bottom holds the page's state and logic (`renderVals()` returns the template's values and handlers). `Register.dc.html`'s script contains the working validation, date generation, signature-matching and step logic; port it.
- Links between `*.dc.html` files are page links (`Main.dc.html` → `/`, etc.).

## Image references

Prototype images point at canvas asset URLs. Map them to the files in `../assets/images/`:

| Prototype URL | File |
|---|---|
| `/_blob/02d4dba224e80ce6c550c9343e6fd6ab` | `bg_night-search-headlamps.jpg` |
| `/_blob/8e38630a367b5b55a5abaaf863772f4a` | `image01_rappel-mossy-crevice.jpg` |
| `/_blob/9b3c1b87c27d154796a6e4626782b0d1` | `image02_night-wall-rappel.jpg` |
| `/_blob/3f5522218d103f4a2fd888cdd7cb1b97` | `image03_river-ropes-dusk.jpg` |
| `/_blob/0eb659243e776ffbcb340e23895914d0` | `image04_founder-tripod-litter-raise.jpg` |
| `/_blob/18058d499a3adb7d9a58f50427957c20` | `image05_night-casualty-scenario.jpg` |
| `/_blob/208a891be23be3b6ebf97e97289b5009` | `image06_litter-rigging-overlook.jpg` (site background) |
| `/_blob/57f00c15f3b88735be82a85c31233184` | `image07_litter-edge-transfer.jpg` |
| `/_blob/7be299b741cf198a044d34d581f54574` | `share_ncrt-wordmark.jpg` (NCRT share image) |

## Known prototype shortcuts (fix in production)

- Payment button skips straight to the confirmation state — wire Stripe Checkout (SPEC §5).
- Forms don't submit anywhere — wire the APIs (SPEC §5, §7).
- NCRT video is a link-out box — embed it (SPEC §4).
- `tel:` / `mailto:` links are empty — fill from config.
- Price shows `[Price]` — from config.
