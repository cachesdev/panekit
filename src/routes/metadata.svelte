<script>
	import { usePM } from '$lib/pane-manager.svelte.js';

	const pm = usePM();
</script>

<p>Cantidad de ventanas: {pm.panes?.length ?? 0}</p>
