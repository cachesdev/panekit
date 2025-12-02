<script lang="ts">
	import { Pane, PanekitProvider, PaneState } from '$lib/index.js';
	import Metadata from './metadata.svelte';

	const leftPane = new PaneState({
		id: 'ventana-izquierda',
		portalId: 'left-panel',
		constrainToPortal: true
	});

	const rightPane = new PaneState({
		size: { width: 300, height: 250 },
		portalId: 'right-panel',
		constrainToPortal: true
	});

	function toggleMaximize1() {
		if (leftPane.maximised) {
			leftPane.restore();
		} else {
			leftPane.maximize();
		}
	}

	function toggleMaximize2() {
		if (rightPane.maximised) {
			rightPane.restore();
		} else {
			rightPane.maximize();
		}
	}
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

	<!-- Left pane -->
	<Pane.Root paneState={leftPane} class="border">
		<Pane.Handle>{leftPane.titleText}</Pane.Handle>
		<Pane.Content>
			<button onclick={toggleMaximize1} class="border bg-black px-4 py-2 text-white">
				{leftPane.maximised ? 'Restore' : 'Maximize'}
			</button>
			<input
				type="range"
				min="1"
				max="1000"
				bind:value={
					() => rightPane.position?.x ?? 0,
					(v) => v && rightPane.position && (rightPane.position!.x = v)
				}
			/>
			<Metadata />
			<p class="mt-2">Size: {leftPane.size.width}x{leftPane.size.height}</p>
		</Pane.Content>
	</Pane.Root>

	<!-- Right pane -->
	<Pane.Root paneState={rightPane} class="border">
		<Pane.Handle>{rightPane.titleText}</Pane.Handle>
		<Pane.Content>
			<button onclick={toggleMaximize2} class="border bg-green-700 px-4 py-2 text-white">
				{rightPane.maximised ? 'Restore' : 'Maximize'}
			</button>
			<p class="mt-2">Size: {rightPane.size.width}x{rightPane.size.height}</p>
			<p>
				Position: {rightPane.position?.x ?? 'centered'}, {rightPane.position?.y ?? 'centered'}
			</p>
			<p>Focused: {rightPane.focused ? 'Yes' : 'No'}</p>
		</Pane.Content>
	</Pane.Root>
</PanekitProvider>
