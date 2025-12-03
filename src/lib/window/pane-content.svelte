<script lang="ts">
	import {
		cn,
		type HTMLDivAttributes,
		type WithChildren,
		type WithElementRef
	} from '$lib/utils.js';

	type Props = WithChildren<WithElementRef<HTMLDivAttributes, HTMLDivElement>>;

	let { ref = $bindable(null), children, class: className, ...restProps }: Props = $props();
</script>

<div
	class={cn('w-full flex-1 overflow-auto', className)}
	data-pane-content=""
	bind:this={ref}
	{...restProps}
>
	{@render children?.()}
</div>
