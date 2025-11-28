import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

export type PaneSize = { height: number; width: number };
export type PanePosition = { x: number; y: number };

export type DragModifier = 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey';
export type HTMLElementOrSelector = HTMLElement | string;
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const defaultModifier: DragModifier = 'altKey';

export interface PaneStateOptions {
	id?: string;
	size?: PaneSize;
	position?: PanePosition;
	maximised?: boolean;
	dragModifier?: DragModifier;
	canDrag?: boolean;
	canResize?: boolean;
	constrainToPortal?: boolean;
	constrainTo?: HTMLElementOrSelector;
	portalId?: string;
	resizeHandles?: ResizeHandle[];
	resizeHandleSize?: number;
	resizeHandleOffset?: number;
	invisibleResizeHandles?: boolean;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
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
	// TODO: Changing position externally doesn't reflect visually
	position = $state<PanePosition | undefined>(undefined);
	maximised = $state(false);
	#sizeBeforeMaximise = $state<PaneSize | undefined>(undefined);
	#positionBeforeMaximise = $state<PanePosition | undefined>(undefined);

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
	// TODO: Changing portal ID doesn't change portal ref
	portalId = $state<string | undefined>(undefined);

	// Resize configuration
	resizeHandles = $state<ResizeHandle[]>(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']);
	resizeHandleSize = $state(8);
	resizeHandleOffset = $state(8);
	invisibleResizeHandles = $state(true);
	minWidth = $state<number | undefined>(undefined);
	minHeight = $state<number | undefined>(undefined);
	maxWidth = $state<number | undefined>(undefined);
	maxHeight = $state<number | undefined>(undefined);

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
			// Resize options
			if (opts.resizeHandles) this.resizeHandles = opts.resizeHandles;
			if (opts.resizeHandleSize !== undefined) this.resizeHandleSize = opts.resizeHandleSize;
			if (opts.resizeHandleOffset !== undefined) this.resizeHandleOffset = opts.resizeHandleOffset;
			if (opts.invisibleResizeHandles !== undefined)
				this.invisibleResizeHandles = opts.invisibleResizeHandles;
			if (opts.minWidth !== undefined) this.minWidth = opts.minWidth;
			if (opts.minHeight !== undefined) this.minHeight = opts.minHeight;
			if (opts.maxWidth !== undefined) this.maxWidth = opts.maxWidth;
			if (opts.maxHeight !== undefined) this.maxHeight = opts.maxHeight;
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

	// TODO: needs optimizing
	maximize() {
		if (!this.maximised) {
			// Store current size before maximizing
			this.#sizeBeforeMaximise = { ...this.size };

			// If position is not set yet, calculate it from DOM
			if (this.position === undefined && this.ref && this.portalTargetRef) {
				const rect = this.ref.getBoundingClientRect();
				const portalRect = this.portalTargetRef.getBoundingClientRect();
				this.position = {
					x: rect.left - portalRect.left,
					y: rect.top - portalRect.top
				};
			}

			// Store current position before maximizing
			this.#positionBeforeMaximise = this.position ? { ...this.position } : undefined;

			// HACK: if position is not set and we try to change size, weird things happen
			this.position = { x: 0, y: 0 };

			if (this.portalTargetRef) {
				this.size = {
					height: this.portalTargetRef.clientHeight,
					width: this.portalTargetRef.clientWidth
				};
			}
		}
		this.maximised = true;
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

// TODO: should use the new type safe context API from svelte 5
const PaneManagerKey = Symbol('paneManager');

export function setPaneManagerContext(wm: PaneManager) {
	setContext(PaneManagerKey, wm);
}

export function usePM(): PaneManager {
	return getContext(PaneManagerKey);
}

export function findPortalTarget(element: HTMLElement, portalId?: string) {
	if (portalId)
		return document.querySelector<HTMLElement>(`[data-pane-portal-target="${portalId}"]`);

	let current: HTMLElement | null = element;

	while (current && current.tagName !== document.documentElement.tagName) {
		const target = current.querySelector('[data-pane-portal-target=""]');
		if (target && target instanceof HTMLElement) {
			return target;
		}
		current = current.parentElement;
	}

	return null;
}
