import type { Attachment } from 'svelte/attachments';
import type { PaneState, ResizeHandle } from './pane-manager.svelte.js';

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

function resize(pane: PaneState): Attachment<HTMLElement> {
	return (element) => {
		let isResizing = false;
		let currentHandle: ResizeHandle;
		let startX = 0;
		let startY = 0;
		let startWidth = 0;
		let startHeight = 0;
		let startDragX = 0;
		let startDragY = 0;
		const handleElements: HTMLElement[] = [];

		const handles = pane.resizeHandles;
		const handleSize = pane.resizeHandleSize;
		const handleOffset = pane.resizeHandleOffset;
		const invisibleHandles = pane.invisibleResizeHandles;

		handles.forEach((handle) => {
			const handleElement = document.createElement('div');
			handleElement.setAttribute('data-resize-handle', handle);
			handleElement.style.cssText = getHandleStyles(
				handle,
				handleSize,
				handleOffset,
				!invisibleHandles
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

			pane.isResizing = true;

			const rect = element.getBoundingClientRect();
			startWidth = rect.width;
			startHeight = rect.height;

			// Get the actual current position from the DOM if pane.position is not set
			// This handles the case where the pane hasn't been dragged yet
			if (pane.position === undefined && pane.portalTargetRef) {
				const portalRect = pane.portalTargetRef.getBoundingClientRect();
				startDragX = rect.left - portalRect.left;
				startDragY = rect.top - portalRect.top;
			} else {
				const pos = pane.position ?? { x: 0, y: 0 };
				startDragX = pos.x;
				startDragY = pos.y;
			}

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

			// Get constraints from pane
			// If no minWidth/minHeight is set, derive from content or use a sensible default
			let minWidth = pane.minWidth;
			let minHeight = pane.minHeight;

			// If no explicit minimum is set, calculate based on content
			if (minWidth === undefined) {
				// Use at least 100px or the content width, whichever is larger; FIXME: Doesn't work very well
				minWidth = Math.max(100, pane.contentRef?.scrollWidth ?? 100);
			}

			if (minHeight === undefined) {
				// Use handle height + some content space, or at least 100px
				const handleHeight = pane.handleRef?.offsetHeight ?? 0;
				const contentMinHeight = pane.contentRef?.scrollHeight ?? 0;
				minHeight = Math.max(100, handleHeight + Math.min(contentMinHeight, 50));
			}

			let maxWidth = pane.maxWidth;
			let maxHeight = pane.maxHeight;

			// If constrainToPortal is enabled, calculate max size based on position and portal bounds
			if (pane.constrainToPortal && pane.portalTargetRef) {
				const startPos = { x: startDragX, y: startDragY };

				// For right/bottom edges: available space = portal size - start position
				// For left/top edges: available space = start position + start size
				// (because growing left/top means moving position toward 0)

				let availableWidth: number;
				let availableHeight: number;

				if (currentHandle.includes('w')) {
					// Resizing from left: can't go past x=0
					availableWidth = startPos.x + startWidth;
				} else {
					// Resizing from right: can't go past portal width
					availableWidth = pane.portalTargetRef.clientWidth - startPos.x;
				}

				if (currentHandle.includes('n')) {
					// Resizing from top: can't go past y=0
					availableHeight = startPos.y + startHeight;
				} else {
					// Resizing from bottom: can't go past portal height
					availableHeight = pane.portalTargetRef.clientHeight - startPos.y;
				}

				// Apply both portal bounds and any explicitly set maxWidth/maxHeight
				maxWidth = maxWidth !== undefined ? Math.min(maxWidth, availableWidth) : availableWidth;
				maxHeight =
					maxHeight !== undefined ? Math.min(maxHeight, availableHeight) : availableHeight;
			}

			const constraintOptions = {
				minWidth,
				minHeight,
				maxWidth,
				maxHeight
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

			pane.size = { width: constrainedWidth, height: constrainedHeight };

			// Always update position to ensure it's set, even for right/bottom resizing
			if (currentHandle.includes('w') || currentHandle.includes('n')) {
				// For left/top resizing, we need to adjust position
				const { x, y } = calculatePositionAdjustment(
					currentHandle,
					startDragX,
					startDragY,
					actualWidthChange,
					actualHeightChange
				);
				pane.position = { x, y };
			} else {
				// For right/bottom resizing, position stays the same but we need to ensure it's set
				pane.position = { x: startDragX, y: startDragY };
			}
		}

		function handleMouseUp(ev: Event) {
			ev.preventDefault();
			isResizing = false;
			pane.isResizing = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.removeEventListener('touchmove', handleTouchMove);
			document.removeEventListener('touchend', handleMouseUp);
			document.body.style.cursor = '';
		}

		return () => {
			handleElements.forEach((handle) => handle.remove());
		};
	};
}

export { resize };
