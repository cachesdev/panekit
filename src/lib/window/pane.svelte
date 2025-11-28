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
	import { usePM, PaneState, findPortalTarget } from '../pane-manager.svelte.js';
	import type { ControlsPluginData } from '../types.js';
	import { type WithChildren, type WithElementRef, type HTMLDivAttributes, cn } from '../utils.js';
	import { resize } from '$lib/resize.svelte.js';
	import { onMount, tick } from 'svelte';
	import { portal } from '$lib/portal.svelte';
	import { onClickOutside, ElementSize } from 'runed';

	type Props = WithChildren<WithElementRef<HTMLDivAttributes, HTMLDivElement>> & {
		paneState: PaneState;
	};

	let {
		ref = $bindable(null),
		children,
		class: className,
		paneState: pane,
		...restProps
	}: Props = $props();

	const wm = usePM();

	let ready = $state(false);

	const portalSize = new ElementSize(() => pane.portalTargetRef);

	// HACK: this function is needed since Neodrag wont update draggable zones by itself after resize happens.
	// it's a hack because neodrag doesn't even make these types visible. PD: it may be a neodrag bug that this isn't triggered.
	function recomputeDraggableZones() {
		if (ref && instances.has(ref)) {
			const data: ControlsPluginData = instances.get(ref)!.states.get('neodrag:controls');
			const { allow_zones, block_zones } = data.compute_zones();
			data.allow_zones = allow_zones;
			data.block_zones = block_zones;
		}
	}

	onMount(() => {
		if (ref) {
			pane.ref = ref;
			wm.addPane(pane);
			pane.handleRef = (ref.querySelector('[data-pane-handle]') as HTMLDivElement) ?? undefined;
			pane.contentRef = (ref.querySelector('[data-pane-content]') as HTMLDivElement) ?? undefined;

			onClickOutside(
				() => ref,
				() => pane.blur()
			);

			// hack so that the portalTarget attachment runs first.
			tick().then(() => {
				if (ref) {
					pane.portalTargetRef =
						(findPortalTarget(ref, pane.portalId) as HTMLDivElement) ?? undefined;

					// if maximised was preset, we trigger it
					if (pane.portalTargetRef && pane.maximised) {
						pane.size = {
							height: pane.portalTargetRef.clientHeight,
							width: pane.portalTargetRef.clientWidth
						};
					}
				}
			});
		}

		ready = true;

		return () => {
			wm.removePane(pane.id);
		};
	});

	// TODO: This is a quick hack but we should probably store it as a prop and do it properly
	$effect(() => {
		if (ref) {
			ref.style.zIndex = pane.focused ? '1000' : '10';
		}
	});

	// Constrain pane position and size when portal resizes
	$effect(() => {
		if (
			!pane.constrainToPortal ||
			!pane.portalTargetRef ||
			!ready ||
			pane.maximised ||
			pane.isDragging ||
			pane.isResizing
		) {
			return;
		}

		// Read portal size to track it
		const portalWidth = portalSize.current.width;
		const portalHeight = portalSize.current.height;

		if (portalWidth === 0 || portalHeight === 0) return;

		const pos = pane.position;
		if (!pos) return; // Don't adjust if position not set yet

		let newSize = { ...pane.size };
		let newPos = { ...pos };
		let changed = false;

		// If pane is too wide for portal, shrink it
		if (newSize.width > portalWidth) {
			newSize.width = portalWidth;
			changed = true;
		}

		// If pane is too tall for portal, shrink it
		if (newSize.height > portalHeight) {
			newSize.height = portalHeight;
			changed = true;
		}

		// If pane extends beyond right edge, move it left
		if (newPos.x + newSize.width > portalWidth) {
			newPos.x = Math.max(0, portalWidth - newSize.width);
			changed = true;
		}

		// If pane extends beyond bottom edge, move it up
		if (newPos.y + newSize.height > portalHeight) {
			newPos.y = Math.max(0, portalHeight - newSize.height);
			changed = true;
		}

		// If pane is beyond left edge, move it right
		if (newPos.x < 0) {
			newPos.x = 0;
			changed = true;
		}

		// If pane is beyond top edge, move it down
		if (newPos.y < 0) {
			newPos.y = 0;
			changed = true;
		}

		if (changed) {
			pane.size = newSize;
			pane.position = newPos;
		}
	});

	// Neodrag reactive compartments; FIXME: This is what may be breaking programatic positioning
	const positionComp = Compartment.of(() => {
		return position({ current: pane.position, default: pane.centered });
	});

	const eventsComp = Compartment.of(() =>
		events({
			onDragStart() {
				pane.isDragging = true;
			},
			onDrag: (data) => {
				pane.position = data.offset;
			},
			onDragEnd() {
				pane.isDragging = false;
			}
		})
	);

	const controlsComp = Compartment.of(() =>
		controls({
			allow: (root) => {
				if (pane.modifierHeld) {
					return ControlFrom.elements([ref])(root);
				}
				return ControlFrom.elements([pane.handleRef])(root);
			},
			block: ControlFrom.elements([pane.contentRef])
		})
	);

	const boundsComp = Compartment.of(() => {
		if (pane.constrainTo) {
			if (pane.constrainTo instanceof HTMLElement) {
				return bounds(BoundsFrom.element(pane.constrainTo));
			}
			return bounds(BoundsFrom.selector(pane.constrainTo));
		}
		if (pane.portalTargetRef && pane.constrainToPortal) {
			return bounds(BoundsFrom.element(pane.portalTargetRef));
		}
	});

	// React to external size changes; TODO: may need to move this into the pane class instead
	$effect(() => {
		if (ref && ready) {
			ref.style.width = `${pane.size.width}px`;
			ref.style.height = `${pane.size.height}px`;

			// Recompute draggable zones when size changes
			tick().then(() => {
				recomputeDraggableZones();
			});
		}
	});
</script>

<svelte:window
	onkeydown={(ev) => {
		if (ev[pane.dragModifier]) {
			pane.modifierHeld = true;
		}
	}}
	onkeyup={(ev) => {
		if (!ev[pane.dragModifier]) {
			pane.modifierHeld = false;
		}
	}}
/>

<div
	class={cn('absolute flex flex-col', pane.isDragging && 'cursor-grabbing', className)}
	hidden={!ready}
	role="dialog"
	tabindex="-1"
	data-pane=""
	data-pane-id={pane.id}
	{@attach portal({ target: pane.portalTargetRef })}
	{@attach pane.canDrag &&
		!pane.maximised &&
		draggable(() => [positionComp, eventsComp, controlsComp, boundsComp])}
	{@attach pane.canResize && !pane.maximised && resize(pane)}
	onmousedown={() => {
		wm.focusPane(pane.id);
		ref?.focus();
	}}
	bind:this={ref}
	{...restProps}
>
	{@render children?.()}
</div>
