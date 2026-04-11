import { useEffect, useMemo, useRef, useState } from "react";
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDispatch, useSelector } from 'react-redux';
import { updateLayout } from '@/redux/slices/dashboardSlice';

// Custom WidthProvider since 'react-grid-layout' export is missing/broken in this version
function WidthProvider(ComposedComponent) {
    function WidthProviderComponent(props) {
        const [width, setWidth] = useState(1200);
        const elementRef = useRef(null);

        useEffect(() => {
            const element = elementRef.current;
            if (!element) return;

            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setWidth(entry.contentRect.width);
                }
            });

            resizeObserver.observe(element);

            // Set initial width
            setWidth(element.offsetWidth);

            return () => {
                resizeObserver.disconnect();
            };
        }, []);

        return (
            <div className={props.className} style={{ ...props.style, width: '100%' }} ref={elementRef}>
                <ComposedComponent {...props} width={width} />
            </div>
        );
    }

    WidthProviderComponent.displayName = `WidthProvider(${ComposedComponent.displayName || ComposedComponent.name || 'Component'})`;
    return WidthProviderComponent;
}

const ResponsiveGridLayout = WidthProvider(Responsive);

const ResizableDashboardGrid = ({ role, children, defaultLayouts }) => {
    const dispatch = useDispatch();
    const storedLayouts = useSelector((state) => state.dashboard.layouts[role]);

    // Use stored layout if available, otherwise use defaults
    // react-grid-layout expects specific layout objects {i, x, y, w, h}

    // We will merge stored and default to ensure all items are present
    const layouts = useMemo(() => {
        if (storedLayouts && storedLayouts.length > 0) {
            return { lg: storedLayouts, md: storedLayouts, sm: storedLayouts, xs: storedLayouts, xxs: storedLayouts };
        }
        return defaultLayouts; // { lg: [...], ... }
    }, [storedLayouts, defaultLayouts]);

    const handleLayoutChange = (currentLayout) => {
        // We only persist the current breakpoint layout for simplicity in this mvp, 
        // or we could try to persist all. For now, saving the 'lg' or current result is typical.
        // allLayouts is an object { lg: [...], md: [...] }

        // We will save the layout that is currently active or just save the array 
        // and let the grid figure it out.

        // Simpler approach: Save just the array as a generic layout and apply it.
        dispatch(updateLayout({ role, layout: currentLayout }));
    };

    return (
        <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={30}
            onLayoutChange={handleLayoutChange}
            isDraggable={true}
            isResizable={true}
            margin={[16, 16]}
            draggableHandle=".drag-handle"
        >
            {children}
        </ResponsiveGridLayout>
    );
};

export default ResizableDashboardGrid;
