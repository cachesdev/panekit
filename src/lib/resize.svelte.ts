import type { Attachment } from 'svelte/attachments';
import type { PaneState, ResizeHandle } from './pane-manager.svelte.js';

/** Maps internal handle representation to their CSS variations. */
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

/** Calculates CSS styles for a given handle. */
function getHandleStyles(handle: ResizeHandle, size = 8, offset = 8, showHandles = false): string {
	const base = `position: absolute; cursor: ${cursors[handle]};`;
	const bg = showHandles ? 'background: rgba(255,0,0,0.3);' : 'background: transparent;';
	const dimensions = `width: ${size}px; height: ${size}px;`;

	// INFO: in absolute positioning, the browser will automatically set non
	// explicit positions (top, bottom, right, left) to satisfy the explicit
	// ones, hence why the corner handles automatically get positioned properly.
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

function getEventCoordinates(ev: MouseEvent | TouchEvent): [number, number] {
	if (ev instanceof MouseEvent) {
		return [ev.clientX, ev.clientY];
	} else {
		const touch = ev.touches[0];
		return [touch.clientX, touch.clientY];
	}
}

function resize(pane: PaneState): Attachment<HTMLElement> {
	return (element) => {
		const handleElements: HTMLElement[] = [];

		const handles = pane.resizeHandles;
		const handleSize = pane.resizeHandleSize;
		const handleOffset = pane.resizeHandleOffset;
		const showResizeHandles = pane.showResizeHandles;

		handles.forEach((handle) => {
			const handleElement = document.createElement('div');
			handleElement.setAttribute('data-resize-handle', handle);
			handleElement.style.cssText = getHandleStyles(
				handle,
				handleSize,
				handleOffset,
				showResizeHandles
			);

			handleElement.addEventListener('mousedown', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				startResize(element, pane, ev, handle);
			});

			handleElement.addEventListener('touchstart', (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				startResize(element, pane, ev, handle);
			});

			element.appendChild(handleElement);
			handleElements.push(handleElement);
		});

		return () => {
			handleElements.forEach((handle) => handle.remove());
		};
	};
}

function startResize(
	element: HTMLElement,
	pane: PaneState,
	ev: MouseEvent | TouchEvent,
	handle: ResizeHandle
) {
	const [startX, startY] = getEventCoordinates(ev);
	const rect = element.getBoundingClientRect();
	const startWidth = rect.width;
	const startHeight = rect.height;

	// Get the actual current position from the DOM if pane.position is not set
	// This handles the case where the pane hasn't been dragged yet
	const startDragX = (() => {
		if (pane.position === undefined && pane.portalTargetRef) {
			const portalRect = pane.portalTargetRef.getBoundingClientRect();
			return rect.left - portalRect.left;
		}
		return pane.position?.x ?? 0;
	})();

	const startDragY = (() => {
		if (pane.position === undefined && pane.portalTargetRef) {
			const portalRect = pane.portalTargetRef.getBoundingClientRect();
			return rect.top - portalRect.top;
		}
		return pane.position?.y ?? 0;
	})();

	const minWidth = pane.minWidth ?? Math.max(100, pane.contentRef?.scrollWidth ?? 100);
	const minHeight = (() => {
		if (pane.minHeight !== undefined) return pane.minHeight;
		const handleHeight = pane.handleRef?.offsetHeight ?? 0;
		return Math.max(100, handleHeight + 50);
	})();

	pane.isResizing = true;

	function handleMouseMove(ev: MouseEvent) {
		if (!pane.isResizing) return;
		ev.preventDefault();
		ev.stopPropagation();
		processMove(ev.clientX, ev.clientY);
	}

	function handleTouchMove(ev: TouchEvent) {
		if (!pane.isResizing) return;
		ev.preventDefault();
		ev.stopPropagation();
		const touch = ev.touches[0];
		processMove(touch.clientX, touch.clientY);
	}

	function processMove(clientX: number, clientY: number) {
		const deltaX = clientX - startX;
		const deltaY = clientY - startY;

		const { width, height } = calculateNewDimensions(
			handle,
			deltaX,
			deltaY,
			startWidth,
			startHeight
		);

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

			if (handle.includes('w')) {
				// Resizing from left: can't go past x=0
				availableWidth = startPos.x + startWidth;
			} else {
				// Resizing from right: can't go past portal width
				availableWidth = pane.portalTargetRef.clientWidth - startPos.x;
			}

			if (handle.includes('n')) {
				// Resizing from top: can't go past y=0
				availableHeight = startPos.y + startHeight;
			} else {
				// Resizing from bottom: can't go past portal height
				availableHeight = pane.portalTargetRef.clientHeight - startPos.y;
			}

			// Apply both portal bounds and any explicitly set maxWidth/maxHeight
			maxWidth = maxWidth !== undefined ? Math.min(maxWidth, availableWidth) : availableWidth;
			maxHeight = maxHeight !== undefined ? Math.min(maxHeight, availableHeight) : availableHeight;
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
		if (handle.includes('w') || handle.includes('n')) {
			// For left/top resizing, we need to adjust position
			const { x, y } = calculatePositionAdjustment(
				handle,
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
		pane.isResizing = false;
		cleanup();
	}

	function cleanup() {
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		document.removeEventListener('touchmove', handleTouchMove);
		document.removeEventListener('touchend', handleMouseUp);
		document.body.style.cursor = '';
	}

	document.addEventListener('mousemove', handleMouseMove);
	document.addEventListener('mouseup', handleMouseUp);
	document.addEventListener('touchmove', handleTouchMove);
	document.addEventListener('touchend', handleMouseUp);
	document.body.style.cursor = cursors[handle];
}

export { resize };
