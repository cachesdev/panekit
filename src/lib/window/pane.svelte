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
	import { usePM, PaneState } from '../pane-manager.svelte.js';
	import type { ControlsPluginData } from '../types.js';
	import { type WithChildren, type WithElementRef, type HTMLDivAttributes, cn } from '../utils.js';
	import { resize } from '$lib/resize.svelte.js';
	import { onMount, tick } from 'svelte';
	import { portal } from '$lib/portal.svelte';
	import { ElementSize, onClickOutside } from 'runed';

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
	let portalSize = new ElementSize(() => pane.portalTargetRef);

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

	$effect(() => {
		if (pane.portalTargetRef && pane.maximised && portalSize.current) {
			pane.size = {
				height: pane.portalTargetRef.clientHeight,
				width: pane.portalTargetRef.clientWidth
			};
			// Position is already set to 0,0 by maximize() method
		}
	});

	$effect(() => {
		if (ref) {
			ref.style.zIndex = pane.focused ? '1000' : '10';
		}
	});

	// Neodrag compartments - all read/write from pane
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
	{@attach pane.canResize &&
		!pane.maximised &&
		resize({
			minWidth: pane.size.width,
			minHeight: pane.size.height,
			maxWidth: () =>
				pane.constrainToPortal && pane.portalTargetRef
					? pane.portalTargetRef.clientWidth
					: undefined,
			maxHeight: () =>
				pane.constrainToPortal && pane.portalTargetRef
					? pane.portalTargetRef.clientHeight
					: undefined,
			position: pane.position,
			onResizeEnd: () => {
				recomputeDraggableZones();
			},
			onResize: (newSize) => {
				pane.size = newSize;
			},
			onPositionChange(pos) {
				pane.position = pos;
			}
		})}
	onmousedown={() => {
		wm.focusPane(pane.id);
		ref?.focus();
	}}
	bind:this={ref}
	{...restProps}
>
	{@render children?.()}
</div>
