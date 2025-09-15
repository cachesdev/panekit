# what is Panekit?

Panekit is a headless window manager toolkit for Svelte 5.

The idea behind Panekit originates from old school MDI style GUI from the era of Java Swing and Visual Fox Pro, with a modern touch in the form of tiling modes and a declarative style.

![User tries to drag windows around](./static/yay-windows.webp)

## ⚠️ WARNING ⚠️

If you are planning to use this, beware of the following:

- Extremely early development. It barely works.
- I put 0 effort in optimizing (yet)
- I put 0 effort in bundle size (yet)
- I don't plan on properly supporting mobile until Neodrag is ripped out for a different solution. This is currently already buggy on mobile, and I haven't figured out how to fix it.
- If a library helps, I will add it, but the objective is to have no (core) depedendencies in v1.
- Breaking changes will happen, in fact maybe even guaranteed to happen every minor version (until V1)
- I have no tests. This is not because I don't want to test, Playwright just doesn't run in fedora. (I am open to test though! just tell me how)
- I've made this mainly for my personal use, specifically to rewrite the aforementioned MDI style GUIs into more portable web based UI, however I will still accept feature PRs if useful.
- I am a backend dev. "React" for me is that one youtube channel that tried to copyright the word.

## Installation

This library has a peer dependency on svelte 5, **specifically 5.29 or newer**, as it uses attachments to work.

```bash
npm i panekit
```

## Usage

### Basic Setup

First, wrap your application with the `PanekitProvider`. This creates the context needed for window management and sets up the portal target where panes will be rendered.

```svelte
<script>
  import { PanekitProvider } from 'panekit';
</script>

<PanekitProvider>
  <div class="h-dvh w-dvw">
    <!-- Your app content -->
  </div>
</PanekitProvider>
```

### Creating Panes

Panes are composed of three main components: `Root`, `Handle`, and `Content`.

```svelte
<script>
  import { Pane } from 'panekit';
  
  let count = $state(0);
</script>

<Pane.Root class="rounded-md border bg-white shadow-md">
  <Pane.Handle class="flex items-center justify-center">
    Window Title
  </Pane.Handle>
  <Pane.Content class="flex items-center justify-center">
    <button onclick={() => (count += 1)}>
      Count: {count}
    </button>
  </Pane.Content>
</Pane.Root>
```

### Components

#### `PanekitProvider`

The root provider component that must wrap your application.

**Props:**

- `dragModifier?: DragModifier` - Modifier key required for full-pane dragging (`'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey'`). Default: `'altKey'`

#### `Pane.Root`

The main pane container. Panes are draggable and resizable by default.

**Props:**

- `size?: { width: number; height: number }` - Initial size of the pane. Default: `{ width: 200, height: 200 }`
- `paneId?: string` - Custom ID for the pane. Auto-generated if not provided
- `portalId?: string` - Target a specific portal by ID
- `dragModifier?: DragModifier` - Override the global drag modifier for this pane
- `constrainToPortal?: boolean` - Constrains the pane to the portal bounds
- `constrainTo?: HTMLElementOrSelector` - Constrains the pane to a given element or selector
- Standard HTML div attributes

**Behavior:**

- Panes can be dragged by their handle
- Hold the drag modifier key (Alt by default) to drag from anywhere on the pane
- Panes are resizable from all edges and corners
- Clicking a pane brings it to focus (higher z-index and visual highlight)
- Panes are automatically centered in their portal target on mount

#### `Pane.Handle`

The draggable header/title bar of the pane.

**Props:**

- Standard HTML div attributes

#### `Pane.Content`

The main content area of the pane.

**Props:**

- Standard HTML div attributes  

#### `Pane.PortalTarget`

Portal target component for rendering panes. The provider includes one by default, but you can create additional targets.

**Props:**

- `portalId?: string` - Unique identifier for this portal target

### Advanced Usage

#### Custom Portal Targets

You can create multiple portal targets to render panes in different areas:

```svelte
<PanekitProvider>
  <div class="flex h-screen">
    <div class="flex-1">
      <Pane.PortalTarget portalId="left-panel" />
    </div>
    <div class="flex-1">  
      <Pane.PortalTarget portalId="right-panel" />
    </div>
  </div>
  
  <!-- This pane will render in the right panel -->
  <Pane.Root portalId="right-panel">
    <Pane.Handle>Right Side Window</Pane.Handle>
    <Pane.Content>Content here</Pane.Content>
  </Pane.Root>
</PanekitProvider>
```

#### Pane Management

The library provides a (broken, leaky) pane manager for programmatic control:

```svelte
<script>
  import { usePM } from 'panekit';
  
  const paneManager = usePM();
  
  function focusPane(id) {
    paneManager.focusPane(id);
  }
  
  function blurAllPanes() {
    paneManager.blurAll();
  }
</script>
```

### Styling

Panekit is headless and provides minimal default styling. It's designed with utility classes in mind (Tailwind won, accept it), classes are deduplicated and merged via the `cn` helper internally, so svelte 5 cslx classes should still work just fine.

You can style based on data attributes if needed. each component has data attributes you can hook into for styling:

- `[data-pane]` - Applied to pane root elements
- `[data-pane-handle]` - Applied to handle elements  
- `[data-pane-content]` - Applied to content elements
- `[data-pane-portal-target]` - Applied to portal target elements

More data attributes will be added so that you can style based on drag state, resize state, focus state and so on. I am just lazy so I didn't do it yet.

### Browser Support

I honestly have no idea. probably ones that have CSS `has:` and above.
