import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

export type PaneSize = { height: number; width: number };

export type DragModifier = 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey';
export type HTMLElementOrSelector = HTMLElement | string;

const defaultModifier: DragModifier = 'altKey';

export interface PaneStateOptions {
	id?: string;
	size?: PaneSize;
	position?: { x: number; y: number };
	maximised?: boolean;
	dragModifier?: DragModifier;
	canDrag?: boolean;
	canResize?: boolean;
	constrainToPortal?: boolean;
	constrainTo?: HTMLElementOrSelector;
	portalId?: string;
}

export class PaneState {
	// Core identity
	#id = $state(crypto.randomUUID() as string);

	// Refs (set by component)
	ref = $state<HTMLDivElement | undefined>(undefined);
	portalTargetRef = $state<HTMLDivElement | undefined>(undefined);
	handleRef = $state<HTMLDivElement | undefined>(undefined);
	contentRef = $state<HTMLDivElement | undefined>(undefined);

	// Layout state
	size = $state<PaneSize>({ width: 200, height: 200 });
	position = $state<{ x: number; y: number } | undefined>(undefined);
	maximised = $state(false);
	#sizeBeforeMaximise = $state<PaneSize | undefined>(undefined);
	#positionBeforeMaximise = $state<{ x: number; y: number } | undefined>(undefined);

	// Interaction state
	focused = $state(false);
	isDragging = $state(false);
	isResizing = $state(false);
	modifierHeld = $state(false);

	// Configuration
	dragModifier = $state<DragModifier>(defaultModifier);
	canDrag = $state(true);
	canResize = $state(true);
	constrainToPortal = $state(false);
	constrainTo = $state<HTMLElementOrSelector | undefined>(undefined);
	portalId = $state<string | undefined>(undefined);

	constructor(opts?: PaneStateOptions) {
		if (opts) {
			if (opts.id) this.#id = opts.id;
			if (opts.size) this.size = opts.size;
			if (opts.position) this.position = opts.position;
			if (opts.maximised !== undefined) this.maximised = opts.maximised;
			if (opts.dragModifier) this.dragModifier = opts.dragModifier;
			if (opts.canDrag !== undefined) this.canDrag = opts.canDrag;
			if (opts.canResize !== undefined) this.canResize = opts.canResize;
			if (opts.constrainToPortal !== undefined) this.constrainToPortal = opts.constrainToPortal;
			if (opts.constrainTo) this.constrainTo = opts.constrainTo;
			if (opts.portalId) this.portalId = opts.portalId;
		}
	}

	// Computed properties
	get centered() {
		if (!this.portalTargetRef) return undefined;
		return {
			x: (this.portalTargetRef.clientWidth - this.size.width) / 2,
			y: (this.portalTargetRef.clientHeight - this.size.height) / 2
		};
	}

	// Actions
	focus() {
		this.focused = true;
	}

	blur() {
		this.focused = false;
	}

	maximize() {
		if (!this.maximised) {
			// Store current size and position before maximizing
			this.#sizeBeforeMaximise = { ...this.size };
			this.#positionBeforeMaximise = this.position ? { ...this.position } : undefined;

			// Set position to 0,0 FIRST so the pane grows from top-left
			this.position = { x: 0, y: 0 };
		}
		this.maximised = true;
		// Size will be set by effect in component
	}

	restore() {
		this.maximised = false;
		// Restore original size and position
		if (this.#sizeBeforeMaximise) {
			this.size = this.#sizeBeforeMaximise;
		}
		if (this.#positionBeforeMaximise !== undefined) {
			this.position = this.#positionBeforeMaximise;
		}
	}

	get id() {
		return this.#id;
	}

	set id(id: string) {
		this.#id = id;
	}
}

export class PaneManager {
	#panes = new SvelteMap<string, PaneState>();
	dragModifier = $state<DragModifier>(defaultModifier);

	constructor(opts?: { dragModifier?: DragModifier }) {
		if (opts && opts.dragModifier) {
			this.dragModifier = opts.dragModifier;
		}
	}

	get panes() {
		return Array.from(this.#panes.values());
	}

	get focusedPane() {
		return this.panes.find((p) => p.focused);
	}

	addPane(pane: PaneState) {
		// Apply manager defaults if pane uses defaults
		if (pane.dragModifier === defaultModifier && this.dragModifier !== defaultModifier) {
			pane.dragModifier = this.dragModifier;
		}

		this.#panes.set(pane.id, pane);
	}

	removePane(id: string) {
		this.#panes.delete(id);
	}

	focusPane(id: string) {
		this.panes.forEach((p) => p.blur());
		this.#panes.get(id)?.focus();
	}

	blurAll() {
		this.panes.forEach((p) => p.blur());
	}

	maximizePane(id: string) {
		this.#panes.get(id)?.maximize();
	}

	restorePane(id: string) {
		this.#panes.get(id)?.restore();
	}

	getPaneById(id: string) {
		return this.#panes.get(id);
	}

	getPanesByPortal(portalId: string) {
		return this.panes.filter((p) => p.portalId === portalId);
	}
}

const PaneManagerKey = Symbol('paneManager');

export function setPaneManagerContext(wm: PaneManager) {
	setContext(PaneManagerKey, wm);
}

export function usePM(): PaneManager {
	return getContext(PaneManagerKey);
}
