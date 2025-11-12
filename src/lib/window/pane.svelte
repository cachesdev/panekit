<script module lang="ts">
	function findPortalTarget(element: HTMLElement, portalId?: string) {
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
</script>

<script lang="ts">
	import {
		bounds,
		BoundsFrom,
		Compartment,
		ControlFrom,
		controls,
		draggable,
		events,
		instances,
		position
	} from '@neodrag/svelte';
	import { usePM, PaneState, type DragModifier } from '../pane-manager.svelte.js';
	import type { ControlsPluginData } from '../types.js';
	import { type WithChildren, type WithElementRef, type HTMLDivAttributes, cn } from '../utils.js';
	import { resize } from '$lib/resize.svelte.js';
	import { onMount, tick } from 'svelte';
	import { portal } from '$lib/portal.svelte';
	import { ElementSize, onClickOutside } from 'runed';

	type HTMLElementOrSelector = HTMLElement | string;

	type Props = WithChildren<WithElementRef<HTMLDivAttributes, HTMLDivElement>> & {
		size?: { width: number; height: number };
		paneId?: string;
		portalId?: string;
		dragModifier?: DragModifier;
		constrainTo?: HTMLElementOrSelector;
		maximised?: boolean;
		canDrag?: boolean;
		canResize?: boolean;
		constrainToPortal?: boolean;
	};

	let {
		ref = $bindable(null),
		children,
		size = $bindable({ width: 200, height: 200 }),
		paneId,
		portalId,
		dragModifier,
		constrainToPortal = false,
		constrainTo,
		maximised = $bindable(false),
		canDrag = true,
		canResize = true,
		class: className,
		...restProps
	}: Props = $props();

	// refs
	let handleRef = $state<HTMLDivElement | null>(null);
	let contentRef = $state<HTMLDivElement | null>(null);
	let portalTargetRef = $state<HTMLElement | null>(null);

	let ready = $state(false);
	let modifierHeld = $state(false);
	let isDragging = $state(false);
	let portalSize = new ElementSize(() => portalTargetRef);

	// calculate center the position based on the portal
	let centerPos = $derived.by(() => {
		if (portalTargetRef) {
			return {
				x: (portalTargetRef.clientWidth - size.width) / 2,
				y: (portalTargetRef.clientHeight - size.height) / 2
			};
		}
	});

	let thisPane = new PaneState({ id: paneId, dragModifier });
	const wm = usePM();

	onMount(() => {
		if (ref) {
			thisPane.ref = ref;
			wm.addPane(() => thisPane!);
			handleRef = ref.querySelector('[data-pane-handle]');
			contentRef = ref.querySelector('[data-pane-content]');

			onClickOutside(
				() => ref,
				() => thisPane.blur()
			);

			// hack so that the portalTarget attachment runs first.
			tick().then(() => {
				if (ref) {
					portalTargetRef = findPortalTarget(ref, portalId);
					if (portalTargetRef && maximised) {
						size = { height: portalTargetRef.clientHeight, width: portalTargetRef.clientWidth };
					}
				}
			});
		}

		ready = true;
	});

	$effect(() => {
		if (portalTargetRef && maximised && portalSize.current) {
			size = { height: portalTargetRef.clientHeight, width: portalTargetRef.clientWidth };
		}
	});

	$effect(() => {
		if (ref && thisPane) {
			ref.style.zIndex = thisPane.focused ? '1000' : '10';
		}
	});

	let elementPosition = $state<{ x: number; y: number }>();

	const positionComp = Compartment.of(() => {
		return position({ current: elementPosition, default: centerPos });
	});
	const eventsComp = Compartment.of(() =>
		events({
			onDragStart() {
				isDragging = true;
			},
			onDrag: (data) => {
				elementPosition = data.offset;
			},
			onDragEnd() {
				isDragging = false;
			}
		})
	);
	const controlsComp = Compartment.of(() =>
		controls({
			allow: (root) => {
				if (modifierHeld) {
					return ControlFrom.elements([ref])(root);
				}
				return ControlFrom.elements([handleRef])(root);
			},
			block: ControlFrom.elements([contentRef])
		})
	);
	const boundsComp = Compartment.of(() => {
		if (constrainTo) {
			if (constrainTo instanceof HTMLElement) {
				return bounds(BoundsFrom.element(constrainTo));
			}
			return bounds(BoundsFrom.selector(constrainTo));
		}
		if (portalTargetRef && constrainToPortal) {
			return bounds(BoundsFrom.element(portalTargetRef));
		}
	});

	function recomputeDraggableZones() {
		if (ref && instances.has(ref)) {
			const data: ControlsPluginData = instances.get(ref)!.states.get('neodrag:controls');
			const { allow_zones, block_zones } = data.compute_zones();
			data.allow_zones = allow_zones;
			data.block_zones = block_zones;
		}
	}

	// React to external size changes
	$effect(() => {
		if (ref && ready) {
			ref.style.width = `${size.width}px`;
			ref.style.height = `${size.height}px`;

			// Recompute draggable zones when size changes
			tick().then(() => {
				recomputeDraggableZones();
			});
		}
	});
</script>

<svelte:window
	onkeydown={(ev) => {
		if (thisPane && ev[thisPane.dragModifier]) {
			modifierHeld = true;
		}
	}}
	onkeyup={(ev) => {
		if (thisPane && !ev[thisPane.dragModifier]) {
			modifierHeld = false;
		}
	}}
/>

<div
	class={cn('absolute flex flex-col', isDragging && 'cursor-grabbing', className)}
	hidden={!ready}
	role="dialog"
	tabindex="-1"
	data-pane=""
	data-pane-id={thisPane?.id}
	{@attach portal({ target: portalTargetRef })}
	{@attach canDrag && draggable(() => [positionComp, eventsComp, controlsComp, boundsComp])}
	{@attach canResize &&
		resize({
			minWidth: size.width,
			minHeight: size.height,
			position: elementPosition,
			onResizeEnd: () => {
				recomputeDraggableZones();
			},
			onResize: (newSize) => {
				size = newSize;
			},
			onPositionChange(pos) {
				elementPosition = pos;
			}
		})}
	onmousedown={() => {
		wm.focusPane(thisPane?.id ?? '');
		ref?.focus();
	}}
	bind:this={ref}
	{...restProps}
>
	{@render children?.()}
</div>
