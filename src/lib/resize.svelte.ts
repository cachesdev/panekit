import type { Attachment } from 'svelte/attachments';
import { extract, type MaybeGetter } from 'runed';

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeOptions {
	minWidth?: MaybeGetter<number>;
	minHeight?: MaybeGetter<number>;
	maxWidth?: MaybeGetter<number>;
	maxHeight?: MaybeGetter<number>;
	handles?: MaybeGetter<ResizeHandle[]>;
	handleSize?: MaybeGetter<number>;
	handleOffset?: MaybeGetter<number>;
	invisibleHandles?: MaybeGetter<boolean>;
	onResizeStart?: () => void;
	onResize?: (size: { width: number; height: number }) => void;
	onResizeEnd?: () => void;
	onPositionChange?: (pos: { x: number; y: number }) => void;
	position?: { x: number; y: number };
}

const cursors: Record<ResizeHandle, string> = {
	n: 'n-resize',
	s: 's-resize',
	e: 'e-resize',
	w: 'w-resize',
	ne: 'ne-resize',
	nw: 'nw-resize',
	se: 'se-resize',
	sw: 'sw-resize'
};

function getCursorForHandle(handle: ResizeHandle): string {
	return cursors[handle];
}

function getHandleStyles(handle: ResizeHandle, size = 8, offset = 8, showHandles = false): string {
	const base = `position: absolute; cursor: ${getCursorForHandle(handle)};`;
	const bg = showHandles ? 'background: rgba(255,0,0,0.3);' : 'background: transparent;';
	const dimensions = `width: ${size}px; height: ${size}px;`;

	const positioning = (() => {
		switch (handle) {
			case 'se':
				return `bottom: -${offset}px; right: -${offset}px;`;
			case 'e':
				return `top: 0; right: -${offset}px; width: ${size}px; height: 100%;`;
			case 's':
				return `bottom: -${offset}px; left: 0; width: 100%; height: ${size}px;`;
			case 'sw':
				return `bottom: -${offset}px; left: -${offset}px;`;
			case 'w':
				return `top: 0; left: -${offset}px; width: ${size}px; height: 100%;`;
			case 'nw':
				return `top: -${offset}px; left: -${offset}px;`;
			case 'n':
				return `top: -${offset}px; left: 0; width: 100%; height: ${size}px;`;
			case 'ne':
				return `top: -${offset}px; right: -${offset}px;`;
			default:
				return '';
		}
	})();

	return base + bg + dimensions + positioning;
}

function applyConstraints(
	width: number,
	height: number,
	constraints: {
		minWidth?: number;
		minHeight?: number;
		maxWidth?: number;
		maxHeight?: number;
	}
) {
	const { minWidth, minHeight, maxWidth, maxHeight } = constraints;

	let constrainedWidth = width;
	let constrainedHeight = height;

	if (minWidth !== undefined) {
		constrainedWidth = Math.max(minWidth, constrainedWidth);
	}
	if (minHeight !== undefined) {
		constrainedHeight = Math.max(minHeight, constrainedHeight);
	}
	if (maxWidth !== undefined) {
		constrainedWidth = Math.min(maxWidth, constrainedWidth);
	}
	if (maxHeight !== undefined) {
		constrainedHeight = Math.min(maxHeight, constrainedHeight);
	}

	return {
		width: constrainedWidth,
		height: constrainedHeight
	};
}

function calculateNewDimensions(
	handle: ResizeHandle,
	deltaX: number,
	deltaY: number,
	startWidth: number,
	startHeight: number
) {
	let newWidth = startWidth;
	let newHeight = startHeight;

	if (handle.includes('e')) newWidth = startWidth + deltaX;
	if (handle.includes('w')) newWidth = startWidth - deltaX;
	if (handle.includes('s')) newHeight = startHeight + deltaY;
	if (handle.includes('n')) newHeight = startHeight - deltaY;

	return { width: newWidth, height: newHeight };
}

function calculatePositionAdjustment(
	handle: ResizeHandle,
	startDragX: number,
	startDragY: number,
	actualWidthChange: number,
	actualHeightChange: number
) {
	let newDragX = startDragX;
	let newDragY = startDragY;

	if (handle.includes('w')) {
		newDragX = startDragX - actualWidthChange;
	}
	if (handle.includes('n')) {
		newDragY = startDragY - actualHeightChange;
	}

	return { x: newDragX, y: newDragY };
}

function resize(options: ResizeOptions = {}): Attachment<HTMLElement> {
	return (element) => {
<<<<<<< Updated upstream
=======
		const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		if (isMobile) {
			return () => {};
		}

>>>>>>> Stashed changes
		const { onResizeStart, onResize, onResizeEnd, onPositionChange } = options;
		const position = options.position;

		let isResizing = false;
		let currentHandle: ResizeHandle;
		let startX = 0;
		let startY = 0;
		let startWidth = 0;
		let startHeight = 0;
		let startDragX = 0;
		let startDragY = 0;
		const handleElements: HTMLElement[] = [];

		const handles = extract<ResizeHandle[]>(options.handles, [
			'n',
			's',
			'e',
			'w',
			'ne',
			'nw',
			'se',
			'sw'
		]);
		const handleSize = extract(options.handleSize);
		const handleOffset = extract(options.handleOffset);
		const invisibleHandles = extract(options.invisibleHandles);

		handles.forEach((handle) => {
			const handleElement = document.createElement('div');
			handleElement.setAttribute('data-resize-handle', handle);
			handleElement.style.cssText = getHandleStyles(
				handle,
				handleSize,
				handleOffset,
				invisibleHandles
			);

			handleElement.addEventListener('mousedown', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				startResize(ev, handle);
			});

			handleElement.addEventListener('touchstart', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				startResize(ev, handle);
			});

			element.appendChild(handleElement);
			handleElements.push(handleElement);
		});

		function getEventCoordinates(ev: MouseEvent | TouchEvent): [number, number] {
			if (ev instanceof MouseEvent) {
				return [ev.clientX, ev.clientY];
			} else {
				const touch = ev.touches[0];
				return [touch.clientX, touch.clientY];
			}
		}

		function startResize(ev: MouseEvent | TouchEvent, handle: ResizeHandle) {
			isResizing = true;
			currentHandle = handle;

			[startX, startY] = getEventCoordinates(ev);

			onResizeStart?.();

			const rect = element.getBoundingClientRect();
			startWidth = rect.width;
			startHeight = rect.height;

			const pos = position ?? { x: 0, y: 0 };
			startDragX = pos.x;
			startDragY = pos.y;

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.addEventListener('touchmove', handleTouchMove);
			document.addEventListener('touchend', handleMouseUp);
			document.body.style.cursor = getCursorForHandle(handle);
		}

		function handleMouseMove(ev: MouseEvent) {
			if (!isResizing) return;
			ev.preventDefault();
			ev.stopPropagation();
			processMove(ev.clientX, ev.clientY);
		}

		function handleTouchMove(ev: TouchEvent) {
			if (!isResizing) return;
			ev.preventDefault();
			ev.stopPropagation();
			const touch = ev.touches[0];
			processMove(touch.clientX, touch.clientY);
		}

		function processMove(clientX: number, clientY: number) {
			const deltaX = clientX - startX;
			const deltaY = clientY - startY;

			const { width, height } = calculateNewDimensions(
				currentHandle,
				deltaX,
				deltaY,
				startWidth,
				startHeight
			);

			const constraintOptions = {
				minWidth: extract(options.minWidth),
				minHeight: extract(options.minHeight),
				maxWidth: extract(options.maxWidth),
				maxHeight: extract(options.maxHeight)
			};

			const { width: constrainedWidth, height: constrainedHeight } = applyConstraints(
				width,
				height,
				constraintOptions
			);

			const actualWidthChange = constrainedWidth - startWidth;
			const actualHeightChange = constrainedHeight - startHeight;

			element.style.setProperty('width', constrainedWidth + 'px');
			element.style.setProperty('height', constrainedHeight + 'px');

			// Notify parent of size change
			onResize?.({ width: constrainedWidth, height: constrainedHeight });

			if (currentHandle.includes('w') || currentHandle.includes('n')) {
				const { x, y } = calculatePositionAdjustment(
					currentHandle,
					startDragX,
					startDragY,
					actualWidthChange,
					actualHeightChange
				);

				onPositionChange?.({ x, y });
			}
		}

		function handleMouseUp(ev: Event) {
			ev.preventDefault();
			isResizing = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleMouseUp);
			document.body.style.cursor = '';

			onResizeEnd?.();
		}

		return () => {
			handleElements.forEach((handle) => handle.remove());
		};
	};
}

export { resize };
