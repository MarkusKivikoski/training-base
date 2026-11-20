import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useRef, type CSSProperties } from 'react';

// Register only what we use, to keep the bundle small. Add chart types here as screens need them.
echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  AxisPointerComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  SVGRenderer,
]);

export type ChartClick = {
  seriesIndex: number;
  dataIndex: number;
};

type EChartProps = {
  option: EChartsCoreOption;
  /** Size classes; defaults to h-72. */
  className?: string;
  style?: CSSProperties;
  ariaLabel: string;
  onClick?: (event: ChartClick) => void;
  /**
   * Index of the category on the first x-axis when anywhere inside a grid is clicked, not only
   * a bar: short or empty bars are hard to hit. The pointer shows a hand over the grids.
   */
  onCategoryClick?: ((index: number) => void) | undefined;
  /** The x-axis value under the crosshair, or null when the pointer leaves the chart. */
  onAxisHover?: ((value: number | null) => void) | undefined;
  /** Receives the ECharts instance (null on unmount), e.g. to drive the tooltip from outside. */
  instanceRef?: (instance: echarts.ECharts | null) => void;
};

/** An ECharts chart (SVG renderer) that resizes with its container and redraws when `option` changes. */
export const EChart = ({
  option,
  className = 'h-72',
  style,
  ariaLabel,
  onClick,
  onCategoryClick,
  onAxisHover,
  instanceRef,
}: EChartProps) => {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  // Callbacks live in refs, so the chart is set up once and always calls the latest ones.
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const onCategoryClickRef = useRef(onCategoryClick);
  onCategoryClickRef.current = onCategoryClick;
  const onAxisHoverRef = useRef(onAxisHover);
  onAxisHoverRef.current = onAxisHover;
  const instanceRefCallback = useRef(instanceRef);
  instanceRefCallback.current = instanceRef;

  useEffect(() => {
    if (!container.current) return;
    const instance = echarts.init(container.current, null, { renderer: 'svg' });
    chart.current = instance;

    instance.on('click', (event) => {
      const point = event as { seriesIndex?: number; dataIndex?: number };
      if (point.seriesIndex === undefined || point.dataIndex === undefined) return;
      onClickRef.current?.({ seriesIndex: point.seriesIndex, dataIndex: point.dataIndex });
    });
    const isInsideGrid = (point: number[]) => {
      const gridCount = (instance.getOption()['grid'] as unknown[] | undefined)?.length ?? 0;
      for (let gridIndex = 0; gridIndex < gridCount; gridIndex++) {
        if (instance.containPixel({ gridIndex }, point)) return true;
      }
      return false;
    };
    instance.getZr().on('click', (event) => {
      if (!onCategoryClickRef.current) return;
      const point = [event.offsetX, event.offsetY];
      if (!isInsideGrid(point)) return;
      // An axis finder takes the x pixel alone; given a point it returns null.
      const index = instance.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
      if (typeof index !== 'number' || index < 0) return;
      onCategoryClickRef.current(index);
    });
    instance.getZr().on('mousemove', (event) => {
      if (!onCategoryClickRef.current) return;
      if (isInsideGrid([event.offsetX, event.offsetY])) instance.getZr().setCursorStyle('pointer');
    });
    instance.on('updateAxisPointer', (event) => {
      const value = (event as { axesInfo?: Array<{ value?: number }> }).axesInfo?.[0]?.value;
      onAxisHoverRef.current?.(typeof value === 'number' ? value : null);
    });
    instance.getZr().on('globalout', () => onAxisHoverRef.current?.(null));
    instanceRefCallback.current?.(instance);

    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      instanceRefCallback.current?.(null);
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={container} role="img" aria-label={ariaLabel} style={style} className={`w-full ${className}`} />;
};
