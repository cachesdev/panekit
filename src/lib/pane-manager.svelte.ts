import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

export type PaneSize = { height: number; width: number };

export type DragModifier = 'altKey' | 'ctrlKey' | 'shiftKey' | 'metaKey';
const defaultModifier: DragModifier = 'altKey';

export class PaneState {
	focused = $state(true);
	ref: HTMLDivElement | undefined;
	portalTargetRef: HTMLDivElement | undefined;
	size: PaneSize;
	#id = $state(crypto.randomUUID() as string);
	dragModifier = $state<DragModifier>(defaultModifier);

	constructor({
		size,
		id,
		ref,
		dragModifier
	}: {
		size: PaneSize;
		id?: string;
		ref?: HTMLDivElement;
		dragModifier?: DragModifier;
	}) {
		this.size = size;

		if (id) {
			this.#id = id;
		}

		if (ref) {
			this.ref = ref;
		}
		if (dragModifier) {
			this.dragModifier = dragModifier;
		}
	}

	get id() {
		return this.#id;
	}

	set id(id: string) {
		this.#id = id;
	}

	focus() {
		this.focused = true;
	}

	blur() {
		this.focused = false;
	}
}

export class PaneManager {
	#paneList = new SvelteMap<string, () => PaneState>();
	dragModifier = $state<DragModifier>(defaultModifier);

	constructor(opts?: { dragModifier?: DragModifier }) {
		if (opts && opts.dragModifier) {
			this.dragModifier = opts.dragModifier;
		}
	}

	get windowList() {
		return this.#paneList;
	}

	addPane(w: () => PaneState) {
		if (w().dragModifier === defaultModifier && this.dragModifier !== defaultModifier) {
			w().dragModifier = this.dragModifier;
		}

		this.#paneList.set(w().id, w);
	}

	removePane(w: () => PaneState) {
		this.#paneList.delete(w().id);
	}

	focusPane(id: string) {
		const w = this.#paneList.get(id);
		this.#paneList.forEach((w) => w().blur());
		w?.().focus();
	}

	blurAll() {
		this.#paneList.forEach((w) => w().blur());
	}
}

const PaneManagerKey = Symbol('paneManager');

export function setPaneManagerContext(wm: PaneManager) {
	setContext(PaneManagerKey, wm);
}

export function usePM(): PaneManager {
	return getContext(PaneManagerKey);
}
