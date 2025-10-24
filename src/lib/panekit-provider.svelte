<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setPaneManagerContext, PaneManager, type DragModifier } from './pane-manager.svelte';
	import PanePortalTarget from './window/pane-portal-target.svelte';

	type Props = {
		children?: Snippet<[]>;
		dragModifier?: DragModifier;
	};

	let { children, dragModifier = 'altKey' }: Props = $props();

	const wm = new PaneManager({ dragModifier });
	setPaneManagerContext(wm);
</script>

{@render children?.()}
<PanePortalTarget />
