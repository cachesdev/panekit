<script lang="ts">
	import { Pane, PanekitProvider } from '$lib/index.js';

	let maximised = $state(false);
</script>

<PanekitProvider>
	<div class="flex h-screen">
		<div class="flex-1 border">
			<Pane.PortalTarget portalId="left-panel" />
		</div>
		<div class="m-8 flex-1 border">
			<Pane.PortalTarget portalId="right-panel" />
		</div>
	</div>

	<!-- This pane will render in the right panel -->
	<Pane.Root constrainToPortal portalId="right-panel" class="border" bind:maximised>
		<Pane.Handle>Right Side Window</Pane.Handle>
		<button onclick={() => (maximised = !maximised)} class="border bg-black text-white"
			>Maximisar</button
		>
		<Pane.Content>Content here</Pane.Content>
	</Pane.Root>
</PanekitProvider>
