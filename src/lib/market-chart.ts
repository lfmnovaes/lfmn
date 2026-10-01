import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '@/lib/market-data';

export function mountMarketChart(container: HTMLElement) {
  const chart = createChart(container, {
    autoSize: true,
    layout: { background: { type: ColorType.Solid, color: 'transparent' }, attributionLogo: false },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.3 } },
    timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    handleScroll: {
      mouseWheel: false,
      pressedMouseMove: true,
      horzTouchDrag: false,
      vertTouchDrag: false,
    },
    handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: false },
  });
  const prices = chart.addSeries(CandlestickSeries, {
    upColor: '#36bca1',
    downColor: '#e7778b',
    borderVisible: false,
    wickUpColor: '#36bca1',
    wickDownColor: '#e7778b',
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
  });
  const volumes = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    lastValueVisible: false,
    priceLineVisible: false,
  });
  volumes.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
  function palette() {
    const style = getComputedStyle(container);
    chart.applyOptions({
      layout: { textColor: style.getPropertyValue('--muted').trim(), fontSize: 10 },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: style.getPropertyValue('--border').trim() },
      },
    });
  }
  function volume(item: Candle) {
    return {
      time: item.time as UTCTimestamp,
      value: item.volume,
      color: item.close >= item.open ? '#36bca150' : '#e7778b50',
    };
  }
  palette();
  return {
    palette,
    setData(data: Candle[]) {
      prices.setData(data.map((item) => ({ ...item, time: item.time as UTCTimestamp })));
      volumes.setData(data.map(volume));
      chart.timeScale().fitContent();
    },
    update(item: Candle) {
      prices.update({ ...item, time: item.time as UTCTimestamp });
      volumes.update(volume(item));
    },
    remove: () => chart.remove(),
  };
}
